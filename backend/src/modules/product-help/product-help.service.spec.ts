import { ProductHelpService } from './product-help.service'
import type { ProductHelpAiClient } from './product-help-ai.client'

describe('ProductHelpService', () => {
  const aiClient: jest.Mocked<ProductHelpAiClient> = {
    answer: jest.fn(),
  }

  beforeEach(() => jest.clearAllMocks())

  it('blocks patient or clinical content before calling the provider', async () => {
    const service = new ProductHelpService(aiClient)

    const result = await service.ask('Meu paciente João tem CPF 123.456.789-00. Qual diagnóstico devo registrar?')

    expect(aiClient.answer).not.toHaveBeenCalled()
    expect(result.source).toBe('local')
    expect(result.blocked).toBe(true)
    expect(result.answer).toContain('dados de pacientes')
  })

  it('blocks a patient name even when no other identifier is present', async () => {
    const service = new ProductHelpService(aiClient)

    const result = await service.ask('Como organizo no sistema o caso da minha paciente Maria Silva?')

    expect(aiClient.answer).not.toHaveBeenCalled()
    expect(result.blocked).toBe(true)
  })

  it('uses the isolated AI client for a safe product question', async () => {
    aiClient.answer.mockResolvedValue({
      answer: 'Abra Pacientes e selecione Novo paciente.',
      path: '/pacientes',
      confidence: 'high',
    })
    const service = new ProductHelpService(aiClient)

    const result = await service.ask('Como cadastro um paciente no UseCognia?')

    expect(aiClient.answer).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      answer: 'Abra Pacientes e selecione Novo paciente.',
      path: '/pacientes',
      confidence: 'high',
      source: 'gemini',
      blocked: false,
    })
  })

  it('falls back locally when Gemini is unavailable', async () => {
    aiClient.answer.mockRejectedValue(new Error('quota exceeded'))
    const service = new ProductHelpService(aiClient)

    const result = await service.ask('Como vejo minha agenda?')

    expect(result.source).toBe('local')
    expect(result.blocked).toBe(false)
    expect(result.path).toBe('/agenda')
    expect(result.answer).toContain('Agenda')
  })

  it('does not expose a provider-created route outside the allowlist', async () => {
    aiClient.answer.mockResolvedValue({
      answer: 'Acesse as configurações.',
      path: 'https://evil.example',
      confidence: 'high',
    })
    const service = new ProductHelpService(aiClient)

    const result = await service.ask('Onde altero meus dados?')

    expect(result.path).toBeUndefined()
  })
})
