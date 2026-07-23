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

function createService(prospectOverrides: Partial<Prospect> = {}) {
  const prospect = makeProspect(prospectOverrides)
  const prospectsRepo = mockRepo({ findOne: jest.fn().mockResolvedValue(prospect) })
  const signalsRepo = mockRepo()
  const activitiesRepo = mockRepo()
  const searchesRepo = mockRepo()

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
    { generate: jest.fn().mockReturnValue('rascunho') } as any,
  )

  return { svc, prospectsRepo, signalsRepo, activitiesRepo, searchesRepo, prospect }
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

  it('generateDraft() delega ao DraftService e registra atividade', async () => {
    const { svc, activitiesRepo } = createService({ status: 'approved' })
    const result = await svc.generateDraft('p1', 'admin-1')
    expect(result.draft).toBe('rascunho')
    expect(activitiesRepo.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'draft_generated' }))
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
    )

    const result = await svc.expireOldProspects()
    expect(result.expired).toBe(0)
  })
})
