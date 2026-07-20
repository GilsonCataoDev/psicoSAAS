process.env.ENCRYPTION_KEY = 'x'.repeat(32)

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { NeuropsychAssessment } from './entities/neuropsych-assessment.entity'
import { NeuropsychAiAnalysisService } from './neuropsych-ai-analysis.service'
import { AiTextResult } from '../sessions/ai.service'

const PSYCHOLOGIST_ID = '68f05b69-2ed5-4eca-9ec4-0f2b36cf8f76'
const OTHER_PSYCHOLOGIST_ID = 'aaaaaaaa-2ed5-4eca-9ec4-0f2b36cf8f76'
const PATIENT_ID = '46c2eb30-91cf-4f15-8ab0-1e192e04d845'
const ASSESSMENT_ID = '3b048fba-6a7e-4b2d-bfbb-353dfcc17f77'

function qb(overrides: Partial<Record<string, jest.Mock>> = {}) {
  const builder: any = {
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    values: jest.fn(() => builder),
    set: jest.fn(() => builder),
    where: jest.fn(() => builder),
    orIgnore: jest.fn(() => builder),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
    ...overrides,
  }
  return builder
}

function assessment(overrides: Partial<NeuropsychAssessment> = {}): NeuropsychAssessment {
  return {
    id: ASSESSMENT_ID,
    psychologistId: PSYCHOLOGIST_ID,
    patientId: PATIENT_ID,
    status: 'planning',
    evaluatedDomains: ['memory'],
    referralQuestion: undefined,
    clinicalHistory: undefined,
    startedAt: '2026-07-20',
    version: 1,
    batteryItems: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as NeuropsychAssessment
}

const VALID_AI_JSON = JSON.stringify({
  caseSynthesis: [{ text: 'Síntese cautelosa do caso.', basis: ['história clínica'], certainty: 'cautious_inference' }],
  convergences: [],
  divergences: [],
  possiblyPreservedFunctions: [],
  possibleFragilities: [],
  alternativeHypotheses: [],
  missingInformation: ['Faltam dados de linguagem'],
  followUpQuestions: ['Perguntar sobre sono'],
  verificationPoints: [],
  suggestedIntegrationStructure: [],
  disclaimers: ['Sugestão gerada por IA, revisar antes do uso clínico.'],
})

/** set() recebe { neuropsychAnalyses: () => sql }; a chamada de liberação usa GREATEST(...).
 *  JSON.stringify descarta valores de função, então inspecionamos a função diretamente. */
function releasedQuota(qbMock: ReturnType<typeof qb>): boolean {
  return qbMock.set.mock.calls.some((call: any[]) => {
    const fn = call[0]?.neuropsychAnalyses
    return typeof fn === 'function' && String(fn()).includes('GREATEST')
  })
}

function buildService() {
  const assessments = {
    findOne: jest.fn().mockResolvedValue(assessment()),
  }
  const items = { find: jest.fn().mockResolvedValue([]) }
  const analysesQb = qb()
  const analyses = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((value: any) => value),
    save: jest.fn(async (value: any) => ({ id: 'analysis-1', createdAt: new Date(), ...value })),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn(() => analysesQb),
  }
  const aiUsageQb = qb()
  const aiUsage = {
    findOne: jest.fn().mockResolvedValue({ neuropsychAnalyses: 0 }),
    createQueryBuilder: jest.fn(() => aiUsageQb),
  }
  const subscriptions = {
    findOne: jest.fn().mockResolvedValue({ plan: 'pro', status: 'active' }),
  }
  const ai = {
    generateNeuropsychAnalysis: jest.fn<Promise<AiTextResult>, any>().mockResolvedValue({
      text: VALID_AI_JSON,
      usage: { model: 'claude-haiku-4-5-20251001', inputTokens: 500, outputTokens: 300, costUsdMicros: 2000 },
    }),
  }

  const service = new NeuropsychAiAnalysisService(
    assessments as any, items as any, analyses as any, aiUsage as any, subscriptions as any, ai as any,
  )
  return { service, assessments, items, analyses, aiUsage, aiUsageQb, subscriptions, ai }
}

describe('NeuropsychAiAnalysisService', () => {
  it('bloqueia planos sem acesso ao Copiloto (free/essencial)', async () => {
    const { service, subscriptions } = buildService()
    subscriptions.findOne.mockResolvedValue({ plan: 'essencial', status: 'active' })
    await expect(service.generate(ASSESSMENT_ID, ['clinicalHistory'], PSYCHOLOGIST_ID, undefined))
      .rejects.toThrow(ForbiddenException)
  })

  it('não acessa avaliação de outro psicólogo', async () => {
    const { service, assessments } = buildService()
    assessments.findOne.mockResolvedValue(null)
    await expect(service.generate(ASSESSMENT_ID, ['clinicalHistory'], OTHER_PSYCHOLOGIST_ID, undefined))
      .rejects.toThrow(NotFoundException)
    expect(assessments.findOne).toHaveBeenCalledWith({ where: { id: ASSESSMENT_ID, psychologistId: OTHER_PSYCHOLOGIST_ID } })
  })

  it('respeita o limite mensal do plano Pro', async () => {
    const { service, aiUsageQb, aiUsage } = buildService()
    aiUsageQb.execute.mockResolvedValueOnce({ affected: 0 }) // insert (idempotente)
    aiUsageQb.execute.mockResolvedValueOnce({ affected: 0 }) // update falha: limite atingido
    aiUsage.findOne.mockResolvedValue({ neuropsychAnalyses: 30 })
    await expect(service.generate(ASSESSMENT_ID, ['clinicalHistory'], PSYCHOLOGIST_ID, undefined))
      .rejects.toThrow(ForbiddenException)
  })

  it('não cobra a franquia quando o provedor de IA falha', async () => {
    const { service, ai, aiUsageQb } = buildService()
    ai.generateNeuropsychAnalysis.mockRejectedValue(new BadRequestException('Não foi possível gerar a análise agora.'))
    await expect(service.generate(ASSESSMENT_ID, ['clinicalHistory'], PSYCHOLOGIST_ID, undefined))
      .rejects.toThrow(BadRequestException)
    expect(releasedQuota(aiUsageQb)).toBe(true)
  })

  it('trata JSON inválido do modelo com segurança, sem cobrar a franquia', async () => {
    const { service, ai, aiUsageQb, analyses } = buildService()
    ai.generateNeuropsychAnalysis.mockResolvedValue({
      text: 'não é json',
      usage: { model: 'claude-haiku-4-5-20251001', inputTokens: 10, outputTokens: 5, costUsdMicros: 50 },
    })
    await expect(service.generate(ASSESSMENT_ID, ['clinicalHistory'], PSYCHOLOGIST_ID, undefined))
      .rejects.toThrow(BadRequestException)
    expect(analyses.save).not.toHaveBeenCalled()
    expect(releasedQuota(aiUsageQb)).toBe(true)
  })

  it('criptografa a resposta antes de persistir e registra tokens/custo', async () => {
    const { service, analyses } = buildService()
    const result = await service.generate(ASSESSMENT_ID, ['clinicalHistory'], PSYCHOLOGIST_ID, undefined)
    const savedArg = analyses.save.mock.calls[0][0]
    expect(savedArg.response).not.toContain('Síntese cautelosa')
    expect(savedArg.response.split('.').length).toBe(3) // iv.ciphertext.tag
    expect(savedArg.inputTokens).toBe(500)
    expect(savedArg.outputTokens).toBe(300)
    expect(savedArg.costUsdMicros).toBe(2000)
    expect(result.result.caseSynthesis[0].text).toContain('Síntese cautelosa')
  })

  it('nunca inclui nome do paciente ou identificadores no payload enviado à IA', async () => {
    const { service, assessments, ai } = buildService()
    assessments.findOne.mockResolvedValue(assessment({ clinicalHistory: 'hist-cipher' }))
    await service.generate(ASSESSMENT_ID, ['clinicalHistory', 'batteryItems'], PSYCHOLOGIST_ID, undefined)
    const payload = ai.generateNeuropsychAnalysis.mock.calls[0][0]
    const serialized = JSON.stringify(payload).toLowerCase()
    expect(serialized).not.toContain('name')
    expect(serialized).not.toContain('cpf')
    expect(serialized).not.toContain('email')
    expect(payload).not.toHaveProperty('patientId')
    expect(payload).not.toHaveProperty('patientName')
  })

  it('exclusão de análise filtra por avaliação e psicólogo', async () => {
    const { service, analyses } = buildService()
    analyses.delete.mockResolvedValue({ affected: 0 })
    await expect(service.remove(ASSESSMENT_ID, 'analysis-1', PSYCHOLOGIST_ID)).rejects.toThrow(NotFoundException)
    expect(analyses.delete).toHaveBeenCalledWith({ id: 'analysis-1', assessmentId: ASSESSMENT_ID, psychologistId: PSYCHOLOGIST_ID })
  })

  it('exclusão bem-sucedida retorna ok', async () => {
    const { service } = buildService()
    await expect(service.remove(ASSESSMENT_ID, 'analysis-1', PSYCHOLOGIST_ID)).resolves.toEqual({ ok: true })
  })
})
