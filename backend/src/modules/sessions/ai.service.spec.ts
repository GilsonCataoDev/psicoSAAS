process.env.ANTHROPIC_API_KEY = 'sk-test-fake-key-for-unit-tests'
delete process.env.GROQ_API_KEY // testes deste arquivo exercitam o caminho Anthropic (fallback) por padrão

const createMock = jest.fn()
const createChatMock = jest.fn()

jest.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = jest.fn().mockImplementation(() => ({
    messages: { create: createMock },
  }))
  return { __esModule: true, default: MockAnthropic }
})

jest.mock('openai', () => {
  const MockOpenAI = jest.fn().mockImplementation(() => ({
    chat: { completions: { create: createChatMock } },
    audio: { transcriptions: { create: jest.fn() } },
  }))
  return { __esModule: true, default: MockOpenAI }
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

describe('AiService.generateDocumentDraft', () => {
  let service: AiService

  beforeEach(() => {
    createMock.mockReset()
    service = new AiService()
  })

  it('remove identificadores diretos antes de enviar as anotações ao provedor', async () => {
    createMock.mockResolvedValue(fakeUsageResponse('Rascunho seguro'))
    await service.generateDocumentDraft(
      'Paciente relata melhora. Contato nome@exemplo.com, CPF 123.456.789-10 e telefone (87) 99967-5353.',
      'relatorio',
      'analysis',
    )

    const [params] = createMock.mock.calls[0]
    const prompt = params.messages[0].content as string
    expect(prompt).not.toContain('nome@exemplo.com')
    expect(prompt).not.toContain('123.456.789-10')
    expect(prompt).not.toContain('99967-5353')
    expect(prompt).toContain('[e-mail omitido]')
    expect(prompt).toContain('[CPF omitido]')
    expect(prompt).toContain('[telefone omitido]')
  })

  it('limita a parte variável enviada a 8.000 caracteres', async () => {
    createMock.mockResolvedValue(fakeUsageResponse('Rascunho'))
    await service.generateDocumentDraft('A'.repeat(12000), 'atestado', 'demand')
    const [params] = createMock.mock.calls[0]
    const prompt = params.messages[0].content as string
    expect(prompt.length).toBeLessThan(10000)
  })

  it('não vaza o erro interno do provedor', async () => {
    createMock.mockRejectedValue(new Error('dados clínicos refletidos pelo provedor'))
    await expect(
      service.generateDocumentDraft('Anotação clínica suficientemente detalhada.', 'encaminhamento', 'referralReason'),
    ).rejects.toThrow('Não foi possível gerar o rascunho do documento. Tente novamente.')
  })
})

function fakeChatResponse(text: string) {
  return {
    choices: [{ message: { content: text } }],
    usage: { prompt_tokens: 40, completion_tokens: 20 },
  }
}

describe('AiService — provedor de texto (Groq preferido, Anthropic fallback)', () => {
  let service: AiService
  const originalGroqKey = process.env.GROQ_API_KEY
  const originalNodeEnv = process.env.NODE_ENV
  const originalMockFlag = process.env.NEUROPSYCH_AI_MOCK_PROVIDER

  beforeEach(() => {
    createMock.mockReset()
    createChatMock.mockReset()
    service = new AiService()
    // Mock seam desligado por padrão nestes testes — queremos exercitar o
    // caminho real de escolha de provedor, não a guarda de E2E.
    delete process.env.NEUROPSYCH_AI_MOCK_PROVIDER
  })

  afterEach(() => {
    if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY
    else process.env.GROQ_API_KEY = originalGroqKey
    process.env.NODE_ENV = originalNodeEnv
    if (originalMockFlag === undefined) delete process.env.NEUROPSYCH_AI_MOCK_PROVIDER
    else process.env.NEUROPSYCH_AI_MOCK_PROVIDER = originalMockFlag
  })

  it('usa Groq quando GROQ_API_KEY está configurada — nunca chama a Anthropic', async () => {
    process.env.GROQ_API_KEY = 'gsk-test-fake-key'
    createChatMock.mockResolvedValue(fakeChatResponse('[TESTE] resumo gerado via Groq'))
    const result = await service.generateSessionSummary('transcrição de teste')
    expect(createChatMock).toHaveBeenCalledTimes(1)
    expect(createMock).not.toHaveBeenCalled()
    expect(result.text).toBe('[TESTE] resumo gerado via Groq')
    expect(result.usage.model).toBe('llama-3.3-70b-versatile')
  })

  it('cai para Anthropic quando GROQ_API_KEY não está configurada', async () => {
    delete process.env.GROQ_API_KEY
    createMock.mockResolvedValue(fakeUsageResponse('[TESTE] resumo gerado via Anthropic'))
    const result = await service.generateSessionSummary('transcrição de teste')
    expect(createMock).toHaveBeenCalledTimes(1)
    expect(createChatMock).not.toHaveBeenCalled()
    expect(result.text).toBe('[TESTE] resumo gerado via Anthropic')
  })

  it('normaliza corretamente tokens de entrada/saída no formato Groq (prompt_tokens/completion_tokens)', async () => {
    process.env.GROQ_API_KEY = 'gsk-test-fake-key'
    createChatMock.mockResolvedValue(fakeChatResponse('texto'))
    const result = await service.generateSessionSummary('transcrição')
    expect(result.usage.inputTokens).toBe(40)
    expect(result.usage.outputTokens).toBe(20)
  })
})

describe('AiService — mock seam nos rascunhos por IA (paridade com o Copiloto Neuropsicológico)', () => {
  let service: AiService
  const originalNodeEnv = process.env.NODE_ENV
  const originalMockFlag = process.env.NEUROPSYCH_AI_MOCK_PROVIDER

  beforeEach(() => {
    createMock.mockReset()
    createChatMock.mockReset()
    service = new AiService()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    if (originalMockFlag === undefined) delete process.env.NEUROPSYCH_AI_MOCK_PROVIDER
    else process.env.NEUROPSYCH_AI_MOCK_PROVIDER = originalMockFlag
  })

  it.each([
    ['generateSessionSummary', () => service.generateSessionSummary('transcrição qualquer')],
    ['generateProntuarioDraft', () => service.generateProntuarioDraft('anotação qualquer', 'organizar')],
    ['generateDocumentDraft', () => service.generateDocumentDraft('anotação qualquer com mais de vinte caracteres', 'relatorio', 'demand')],
  ])('%s usa o mock fora de produção quando a flag está ligada — nunca chama o provedor', async (_name, call) => {
    process.env.NODE_ENV = 'test'
    process.env.NEUROPSYCH_AI_MOCK_PROVIDER = 'true'
    const result = await call()
    expect(createMock).not.toHaveBeenCalled()
    expect(createChatMock).not.toHaveBeenCalled()
    expect(result.usage.model).toContain('mock')
  })

  it.each([
    ['generateSessionSummary', () => service.generateSessionSummary('transcrição qualquer')],
    ['generateProntuarioDraft', () => service.generateProntuarioDraft('anotação qualquer', 'organizar')],
    ['generateDocumentDraft', () => service.generateDocumentDraft('anotação qualquer com mais de vinte caracteres', 'relatorio', 'demand')],
  ])('%s NUNCA usa o mock quando NODE_ENV=production, mesmo com a flag ligada', async (_name, call) => {
    process.env.NODE_ENV = 'production'
    process.env.NEUROPSYCH_AI_MOCK_PROVIDER = 'true'
    process.env.GROQ_API_KEY = 'gsk-test-fake-key'
    createChatMock.mockResolvedValue(fakeChatResponse('resposta real'))
    await call()
    expect(createChatMock).toHaveBeenCalledTimes(1)
    delete process.env.GROQ_API_KEY
  })
})

describe('AiService.generateChurnDiagnosis', () => {
  let service: AiService

  beforeEach(() => {
    createMock.mockReset()
    createChatMock.mockReset()
    service = new AiService()
    process.env.GROQ_API_KEY = 'gsk-test-fake-key'
  })

  afterEach(() => {
    delete process.env.GROQ_API_KEY
  })

  it('gera a narrativa a partir das métricas, sem alterar o score (determinístico fica em ChurnService)', async () => {
    createChatMock.mockResolvedValue(fakeChatResponse('[TESTE] diagnóstico de churn'))
    const result = await service.generateChurnDiagnosis({
      daysWithoutLogin: 10, patients: 0, sessions: 0, appointments: 0, score: 20,
      reasons: ['Sem login há 10 dias', 'Nenhum paciente cadastrado'],
    })
    const [params] = createChatMock.mock.calls[0]
    const prompt = params.messages[0].content as string
    expect(prompt).toContain('Sem login há 10 dias')
    expect(result.text).toBe('[TESTE] diagnóstico de churn')
  })
})

describe('AiService.generateAssessmentInterpretation', () => {
  let service: AiService

  beforeEach(() => {
    createMock.mockReset()
    createChatMock.mockReset()
    service = new AiService()
    process.env.GROQ_API_KEY = 'gsk-test-fake-key'
  })

  afterEach(() => {
    delete process.env.GROQ_API_KEY
  })

  it('inclui os pontos críticos no prompt e nunca fecha diagnóstico (instrução obrigatória no prompt)', async () => {
    createChatMock.mockResolvedValue(fakeChatResponse('[TESTE] interpretação'))
    await service.generateAssessmentInterpretation(
      'PHQ-9',
      { score: 22, level: 'Grave' },
      [{ label: 'Item 9 positivo', note: 'Investigar ideação suicida/autoagressão' }],
    )
    const [params] = createChatMock.mock.calls[0]
    const prompt = params.messages[0].content as string
    expect(prompt).toContain('Investigar ideação suicida/autoagressão')
    expect(prompt).toContain('Nunca produza diagnóstico definitivo')
  })
})
