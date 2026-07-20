process.env.ANTHROPIC_API_KEY = 'sk-test-fake-key-for-unit-tests'

const createMock = jest.fn()

jest.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = jest.fn().mockImplementation(() => ({
    messages: { create: createMock },
  }))
  return { __esModule: true, default: MockAnthropic }
})

import { BadRequestException } from '@nestjs/common'
import { AiService, NeuropsychAnalysisPayload } from './ai.service'

function fakeUsageResponse(text: string) {
  return {
    content: [{ type: 'text', text }],
    usage: { input_tokens: 100, output_tokens: 50 },
  }
}

function bigBatteryPayload(itemCount: number, resultLength: number): NeuropsychAnalysisPayload {
  return {
    evaluatedDomains: ['memory', 'attention'],
    batteryItems: Array.from({ length: itemCount }, (_, i) => ({
      name: `Procedimento ${i}`,
      procedureType: 'neuropsychological_procedure',
      domains: ['memory'],
      status: 'applied',
      resultSummary: 'X'.repeat(resultLength),
    })),
  }
}

describe('AiService.generateNeuropsychAnalysis', () => {
  let service: AiService

  beforeEach(() => {
    createMock.mockReset()
    service = new AiService()
  })

  it('respeita max_tokens e timeout configurados, passando-os ao provedor', async () => {
    createMock.mockResolvedValue(fakeUsageResponse('{}'))
    await service.generateNeuropsychAnalysis(
      { evaluatedDomains: [], batteryItems: [] },
      { maxOutputTokens: 1234, timeoutMs: 9999, maxInputChars: 5000 },
    )
    const [params, requestOptions] = createMock.mock.calls[0]
    expect(params.max_tokens).toBe(1234)
    expect(requestOptions).toEqual({ timeout: 9999 })
  })

  it('nunca envia um prompt maior que maxInputChars, mesmo com bateria enorme', async () => {
    createMock.mockResolvedValue(fakeUsageResponse('{}'))
    const payload = bigBatteryPayload(500, 3000) // muito maior que qualquer limite razoável
    const maxInputChars = 5000
    await service.generateNeuropsychAnalysis(payload, { maxOutputTokens: 1000, timeoutMs: 10000, maxInputChars })
    const [params] = createMock.mock.calls[0]
    const promptContent = params.messages[0].content as string
    // O prompt inclui instruções fixas do sistema (~2KB) além do registro —
    // o registro em si (a parte variável) deve respeitar o orçamento.
    expect(promptContent.length).toBeLessThan(maxInputChars + 3000)
  })

  it('inclui aviso de truncamento quando itens da bateria são cortados', async () => {
    createMock.mockResolvedValue(fakeUsageResponse('{}'))
    const payload = bigBatteryPayload(200, 2000)
    await service.generateNeuropsychAnalysis(payload, { maxOutputTokens: 1000, timeoutMs: 10000, maxInputChars: 4000 })
    const [params] = createMock.mock.calls[0]
    const promptContent = params.messages[0].content as string
    expect(promptContent).toContain('omitidos por limite de tamanho')
  })

  it('não corta um item da bateria pela metade — inclui inteiro ou omite', async () => {
    createMock.mockResolvedValue(fakeUsageResponse('{}'))
    const payload = bigBatteryPayload(50, 500)
    await service.generateNeuropsychAnalysis(payload, { maxOutputTokens: 1000, timeoutMs: 10000, maxInputChars: 3000 })
    const [params] = createMock.mock.calls[0]
    const promptContent = params.messages[0].content as string
    // Cada item começa com "Procedimento N:" — se algum aparecer sem o resultSummary completo
    // (marcado por uma sequência de "X"), o item foi cortado no meio.
    const matches = [...promptContent.matchAll(/Procedimento \d+: Procedimento \d+.*?(?=\nProcedimento|\n\[|$)/gs)]
    for (const match of matches) {
      if (match[0].includes('X')) {
        expect(match[0]).toMatch(/X{500}/) // resultSummary sempre completo (500 X's) ou ausente
      }
    }
  })

  it('propaga erro genérico ao cliente sem vazar detalhes internos do provedor', async () => {
    createMock.mockRejectedValue(new Error('400 {"error":{"message":"echo of user content: dados sensíveis aqui"}}'))
    await expect(
      service.generateNeuropsychAnalysis({ evaluatedDomains: [], batteryItems: [] }, { maxOutputTokens: 100, timeoutMs: 1000, maxInputChars: 1000 }),
    ).rejects.toThrow(BadRequestException)
    try {
      await service.generateNeuropsychAnalysis({ evaluatedDomains: [], batteryItems: [] }, { maxOutputTokens: 100, timeoutMs: 1000, maxInputChars: 1000 })
    } catch (err: any) {
      expect(err.message).not.toContain('dados sensíveis')
      expect(err.message).not.toContain('echo of user content')
    }
  })

  it('lança erro amigável quando ANTHROPIC_API_KEY está ausente', async () => {
    const original = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    try {
      await expect(
        service.generateNeuropsychAnalysis({ evaluatedDomains: [], batteryItems: [] }, { maxOutputTokens: 100, timeoutMs: 1000, maxInputChars: 1000 }),
      ).rejects.toThrow(BadRequestException)
    } finally {
      process.env.ANTHROPIC_API_KEY = original
    }
  })

  describe('seam de mock do provedor (NEUROPSYCH_AI_MOCK_PROVIDER)', () => {
    const originalNodeEnv = process.env.NODE_ENV
    const originalMockFlag = process.env.NEUROPSYCH_AI_MOCK_PROVIDER

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv
      if (originalMockFlag === undefined) delete process.env.NEUROPSYCH_AI_MOCK_PROVIDER
      else process.env.NEUROPSYCH_AI_MOCK_PROVIDER = originalMockFlag
    })

    it('usa o mock fora de produção quando a flag está ligada — nunca chama o provedor real', async () => {
      process.env.NODE_ENV = 'test'
      process.env.NEUROPSYCH_AI_MOCK_PROVIDER = 'true'
      const result = await service.generateNeuropsychAnalysis(
        { evaluatedDomains: [], batteryItems: [] },
        { maxOutputTokens: 100, timeoutMs: 1000, maxInputChars: 1000 },
      )
      expect(createMock).not.toHaveBeenCalled()
      expect(result.usage.model).toContain('mock')
    })

    it('NUNCA usa o mock quando NODE_ENV=production, mesmo com a flag ligada — chama o provedor real', async () => {
      process.env.NODE_ENV = 'production'
      process.env.NEUROPSYCH_AI_MOCK_PROVIDER = 'true'
      createMock.mockResolvedValue(fakeUsageResponse('{}'))
      await service.generateNeuropsychAnalysis(
        { evaluatedDomains: [], batteryItems: [] },
        { maxOutputTokens: 100, timeoutMs: 1000, maxInputChars: 1000 },
      )
      expect(createMock).toHaveBeenCalledTimes(1)
    })

    it('sem a flag, sempre chama o provedor real independente do ambiente', async () => {
      process.env.NODE_ENV = 'test'
      delete process.env.NEUROPSYCH_AI_MOCK_PROVIDER
      createMock.mockResolvedValue(fakeUsageResponse('{}'))
      await service.generateNeuropsychAnalysis(
        { evaluatedDomains: [], batteryItems: [] },
        { maxOutputTokens: 100, timeoutMs: 1000, maxInputChars: 1000 },
      )
      expect(createMock).toHaveBeenCalledTimes(1)
    })
  })
})
