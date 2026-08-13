import { BadRequestException } from '@nestjs/common'
import { ProspectingService } from './prospecting.service'
import { Prospect } from './entities/prospect.entity'

function mockRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((dto: any) => dto),
    save: jest.fn((entity: any) => Promise.resolve(entity)),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getRawMany: jest.fn().mockResolvedValue([]),
    }),
    ...overrides,
  }
}

function makeProspect(overrides: Partial<Prospect> = {}): Prospect {
  return {
    id: 'p1',
    professionalName: 'Ana Souza',
    city: 'Campinas',
    state: 'SP',
    website: 'https://exemplo.com.br',
    websiteDomain: 'exemplo.com.br',
    professionalEmail: 'ana@gmail.com',
    professionalPhone: '19999998888',
    linkedinUrl: null,
    psymeetUrl: null,
    sourceUrl: 'https://exemplo.com.br',
    sourceType: 'own_site',
    sourceTitle: 'Ana Souza',
    sourceSnippet: 'snippet',
    score: 40,
    confidence: 'medium',
    status: 'discovered',
    privacyBasis: 'legitimate_interest_public_professional_data',
    discoveredAt: new Date(),
    analyzedAt: null,
    lastContactAt: null,
    retentionUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180),
    doNotContact: false,
    doNotContactAt: null,
    deletedAt: null,
    residualHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Prospect
}

function mockAiService(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    generateProspectOutreachDraft: jest.fn().mockRejectedValue(new Error('IA desligada neste teste — fallback esperado')),
    generateProspectReplySuggestion: jest.fn(),
    analyzeSalesConversation: jest.fn(),
    ...overrides,
  }
}

function createService(prospectOverrides: Partial<Prospect> = {}, draftOverride?: Record<string, jest.Mock>, aiOverride?: Record<string, jest.Mock>) {
  const prospect = makeProspect(prospectOverrides)
  const prospectsRepo = mockRepo({ findOne: jest.fn().mockResolvedValue(prospect) })
  const signalsRepo = mockRepo()
  const activitiesRepo = mockRepo()
  const searchesRepo = mockRepo()
  const draft = draftOverride ?? { generate: jest.fn().mockReturnValue('rascunho') }
  const aiService = mockAiService(aiOverride)

  const svc = new ProspectingService(
    prospectsRepo as any,
    signalsRepo as any,
    activitiesRepo as any,
    searchesRepo as any,
    { name: 'mock', search: jest.fn().mockResolvedValue([]) } as any,
    { build: jest.fn().mockReturnValue([]) } as any,
    { findMatch: jest.fn().mockReturnValue(null) } as any,
    { crawlSite: jest.fn().mockResolvedValue([]) } as any,
    { score: jest.fn().mockReturnValue({ score: 0, confidence: 'low', signals: [] }) } as any,
    draft as any,
    aiService as any,
  )

  return { svc, prospectsRepo, signalsRepo, activitiesRepo, searchesRepo, prospect, draft, aiService }
}

describe('ProspectingService — governança', () => {
  it('approve() muda status para approved e registra atividade', async () => {
    const { svc, activitiesRepo } = createService({ status: 'qualified' })
    const result = await svc.approve('p1', 'admin-1', 'ok')
    expect(result.status).toBe('approved')
    expect(activitiesRepo.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'approved' }))
  })

  it('approve() recusa lead marcado como doNotContact', async () => {
    const { svc } = createService({ doNotContact: true })
    await expect(svc.approve('p1', 'admin-1')).rejects.toThrow(BadRequestException)
  })

  it('markDoNotContact() marca doNotContact=true e muda status', async () => {
    const { svc } = createService()
    const result = await svc.markDoNotContact('p1', 'admin-1')
    expect(result.doNotContact).toBe(true)
    expect(result.status).toBe('do_not_contact')
    expect(result.doNotContactAt).toBeInstanceOf(Date)
  })

  it('discard() muda status para discarded', async () => {
    const { svc } = createService()
    const result = await svc.discard('p1', 'admin-1')
    expect(result.status).toBe('discarded')
  })

  it('deleteProspect() remove dados pessoais mas mantém residualHash', async () => {
    const { svc } = createService()
    const result = await svc.deleteProspect('p1', 'admin-1')
    expect(result.deleted).toBe(true)
  })

  it('generateDraft() cai para o template quando a IA falha (fallback nunca bloqueia o admin)', async () => {
    const { svc, activitiesRepo } = createService({ status: 'approved' })
    const result = await svc.generateDraft('p1', 'admin-1')
    expect(result.draft).toBe('rascunho')
    expect(result.source).toBe('template')
    expect(activitiesRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      action: 'draft_generated', notes: 'gerado por template (fallback)',
    }))
  })

  it('generateDraft() usa o texto da IA quando ela responde com sucesso', async () => {
    const aiOverride = { generateProspectOutreachDraft: jest.fn().mockResolvedValue({ text: '  rascunho por IA  ', usage: {} }) }
    const { svc, activitiesRepo } = createService({ status: 'approved' }, undefined, aiOverride)
    const result = await svc.generateDraft('p1', 'admin-1')
    expect(result.draft).toBe('rascunho por IA')
    expect(result.source).toBe('ai')
    expect(activitiesRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      action: 'draft_generated', notes: 'gerado por IA',
    }))
  })

  it('generateDraft() nunca chama a IA quando a guarda do template já rejeita (doNotContact/não aprovado)', async () => {
    const draft = { generate: jest.fn().mockImplementation(() => { throw new BadRequestException('não contatar') }) }
    const { svc, aiService } = createService({ doNotContact: true }, draft)
    await expect(svc.generateDraft('p1', 'admin-1')).rejects.toThrow(BadRequestException)
    expect(aiService.generateProspectOutreachDraft).not.toHaveBeenCalled()
  })
})

describe('ProspectingService — sugestão de resposta (Entrega B)', () => {
  it('suggestReply() recusa lead marcado como doNotContact', async () => {
    const { svc } = createService({ doNotContact: true })
    await expect(svc.suggestReply('p1', { channel: 'whatsapp', leadReplyText: 'oi' })).rejects.toThrow(BadRequestException)
  })

  it('suggestReply() recusa lead não aprovado', async () => {
    const { svc } = createService({ status: 'qualified' })
    await expect(svc.suggestReply('p1', { channel: 'whatsapp', leadReplyText: 'oi' })).rejects.toThrow(BadRequestException)
  })

  it('suggestReply() retorna a sugestão da IA e registra só o canal na atividade (nunca o texto colado)', async () => {
    const aiOverride = { generateProspectReplySuggestion: jest.fn().mockResolvedValue({ text: '  ótimo, vou te mandar o link  ', usage: {} }) }
    const { svc, activitiesRepo, aiService } = createService({ status: 'approved' }, undefined, aiOverride)
    const result = await svc.suggestReply('p1', { channel: 'whatsapp', leadReplyText: 'tenho interesse!' }, 'admin-1')
    expect(result.suggestion).toBe('ótimo, vou te mandar o link')
    expect(aiService.generateProspectReplySuggestion).toHaveBeenCalledWith(expect.objectContaining({ channel: 'whatsapp', leadReplyText: 'tenho interesse!' }))
    expect(activitiesRepo.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'reply_suggested', notes: 'canal: whatsapp' }))
    const [[savedActivity]] = activitiesRepo.save.mock.calls
    expect(JSON.stringify(savedActivity)).not.toContain('tenho interesse')
  })

  it('suggestReply() propaga o erro quando a IA falha (sem fallback de template)', async () => {
    const aiOverride = { generateProspectReplySuggestion: jest.fn().mockRejectedValue(new BadRequestException('indisponível')) }
    const { svc } = createService({ status: 'approved' }, undefined, aiOverride)
    await expect(svc.suggestReply('p1', { channel: 'direct', leadReplyText: 'oi' })).rejects.toThrow(BadRequestException)
  })
})

describe('ProspectingService — assistente comercial', () => {
  const validAnalysis = {
    stage: 'qualified', interestLevel: 'high', painPoints: ['Agenda manual'], objections: [],
    positiveSignals: ['Pediu demonstração'], nextAction: 'Oferecer uma demonstração curta.',
    suggestedReply: 'Posso te mostrar o fluxo em 5 minutos.', shouldStopContact: false,
    reasoning: 'A pessoa declarou interesse e pediu para conhecer.',
  }

  it('retorna análise estruturada sem persistir a conversa', async () => {
    const aiOverride = { analyzeSalesConversation: jest.fn().mockResolvedValue({ text: JSON.stringify(validAnalysis), usage: {} }) }
    const { svc, activitiesRepo, aiService } = createService({}, undefined, aiOverride)
    const result = await svc.analyzeSalesConversation({ channel: 'direct', conversation: 'Lead: Tenho interesse, pode mostrar?' })
    expect(result.stage).toBe('qualified')
    expect(result.suggestedReply).toContain('5 minutos')
    expect(aiService.analyzeSalesConversation).toHaveBeenCalledWith(expect.objectContaining({ channel: 'direct' }))
    expect(activitiesRepo.save).not.toHaveBeenCalled()
  })

  it('bloqueia insistência quando detecta recusa explícita, mesmo se a IA errar', async () => {
    const aiOverride = { analyzeSalesConversation: jest.fn().mockResolvedValue({ text: JSON.stringify(validAnalysis), usage: {} }) }
    const { svc } = createService({}, undefined, aiOverride)
    const result = await svc.analyzeSalesConversation({ channel: 'whatsapp', conversation: 'Lead: Não tenho interesse, por favor não me contate.' })
    expect(result.stage).toBe('lost')
    expect(result.shouldStopContact).toBe(true)
    expect(result.suggestedReply).toContain('não entrarei mais em contato')
  })

  it('rejeita JSON inválido do provedor', async () => {
    const aiOverride = { analyzeSalesConversation: jest.fn().mockResolvedValue({ text: 'resposta fora do formato', usage: {} }) }
    const { svc } = createService({}, undefined, aiOverride)
    await expect(svc.analyzeSalesConversation({ channel: 'direct', conversation: 'Lead: quero entender melhor' })).rejects.toThrow(BadRequestException)
  })
})

describe('ProspectingService — Kanban comercial', () => {
  it('atualiza a etapa e registra somente a transição no histórico', async () => {
    const { svc, prospectsRepo, activitiesRepo } = createService({ status: 'approved' })
    const result = await svc.updateStage('p1', 'contacted', 'admin-1')
    expect(result.status).toBe('contacted')
    expect(result.lastContactAt).toBeInstanceOf(Date)
    expect(prospectsRepo.save).toHaveBeenCalled()
    expect(activitiesRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      action: 'status_changed', notes: 'approved → contacted', actorUserId: 'admin-1',
    }))
  })

  it('não reativa lead marcado como não contatar', async () => {
    const { svc } = createService({ status: 'do_not_contact', doNotContact: true })
    await expect(svc.updateStage('p1', 'interested', 'admin-1')).rejects.toThrow(BadRequestException)
  })

  it('não grava atividade quando a etapa não mudou', async () => {
    const { svc, activitiesRepo } = createService({ status: 'replied' })
    await svc.updateStage('p1', 'replied', 'admin-1')
    expect(activitiesRepo.save).not.toHaveBeenCalled()
  })
})

describe('ProspectingService — expiração (LGPD)', () => {
  it('expira e limpa PII de leads não usados após retentionUntil', async () => {
    const expiredProspect = makeProspect({
      id: 'p-old',
      status: 'discovered',
      retentionUntil: new Date(Date.now() - 1000),
    })
    const prospectsRepo = mockRepo({ find: jest.fn().mockResolvedValue([expiredProspect]) })
    const activitiesRepo = mockRepo()
    const svc = new ProspectingService(
      prospectsRepo as any, mockRepo() as any, activitiesRepo as any, mockRepo() as any,
      { name: 'mock', search: jest.fn() } as any,
      { build: jest.fn() } as any,
      { findMatch: jest.fn() } as any,
      { crawlSite: jest.fn() } as any,
      { score: jest.fn() } as any,
      { generate: jest.fn() } as any,
      mockAiService() as any,
    )

    const result = await svc.expireOldProspects()
    expect(result.expired).toBe(1)
    expect(prospectsRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      status: 'expired', professionalEmail: null, professionalName: null,
    }))
  })

  it('não expira leads dentro do período de retenção', async () => {
    const activeProspect = makeProspect({ id: 'p-active', retentionUntil: new Date(Date.now() + 1000 * 60 * 60) })
    const prospectsRepo = mockRepo({ find: jest.fn().mockResolvedValue([activeProspect]) })
    const svc = new ProspectingService(
      prospectsRepo as any, mockRepo() as any, mockRepo() as any, mockRepo() as any,
      { name: 'mock', search: jest.fn() } as any,
      { build: jest.fn() } as any,
      { findMatch: jest.fn() } as any,
      { crawlSite: jest.fn() } as any,
      { score: jest.fn() } as any,
      { generate: jest.fn() } as any,
      mockAiService() as any,
    )

    const result = await svc.expireOldProspects()
    expect(result.expired).toBe(0)
  })

  it('não expira leads já usados (ex: registered/activated)', async () => {
    const usedProspect = makeProspect({ id: 'p-used', status: 'activated', retentionUntil: new Date(Date.now() - 1000) })
    const prospectsRepo = mockRepo({ find: jest.fn().mockResolvedValue([usedProspect]) })
    const svc = new ProspectingService(
      prospectsRepo as any, mockRepo() as any, mockRepo() as any, mockRepo() as any,
      { name: 'mock', search: jest.fn() } as any,
      { build: jest.fn() } as any,
      { findMatch: jest.fn() } as any,
      { crawlSite: jest.fn() } as any,
      { score: jest.fn() } as any,
      { generate: jest.fn() } as any,
      mockAiService() as any,
    )

    const result = await svc.expireOldProspects()
    expect(result.expired).toBe(0)
  })
})
