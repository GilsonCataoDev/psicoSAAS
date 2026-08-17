import 'reflect-metadata'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { PLAN_KEY } from '../../common/decorators/require-plan.decorator'
import { NeuropsychAssessmentsController } from './neuropsych-assessments.controller'

const GUARDS_METADATA_KEY = '__guards__'

function makeController() {
  const service = {
    list: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 50 }),
    findOne: jest.fn().mockResolvedValue({ id: 'assessment-1', patientId: 'patient-1' }),
    create: jest.fn().mockResolvedValue({ id: 'assessment-1', patientId: 'patient-1' }),
    update: jest.fn().mockResolvedValue({ id: 'assessment-1' }),
    addItem: jest.fn().mockResolvedValue({ id: 'item-1' }),
    updateItem: jest.fn().mockResolvedValue({ id: 'item-1' }),
    removeItem: jest.fn().mockResolvedValue({ ok: true }),
    exportPdf: jest.fn().mockResolvedValue({ filename: 'Laudo.pdf', stream: { on: jest.fn(), pipe: jest.fn(), end: jest.fn() } }),
    createShareLink: jest.fn().mockResolvedValue({ url: 'https://usecognia.com.br/laudo/token-abc' }),
    revokeShareLink: jest.fn().mockResolvedValue({ ok: true }),
  }
  const aiAnalysis = {
    getUsage: jest.fn(),
    list: jest.fn(),
    generate: jest.fn().mockResolvedValue({ id: 'analysis-1' }),
    remove: jest.fn().mockResolvedValue({ ok: true }),
  }
  const audit = { record: jest.fn().mockResolvedValue(undefined) }
  const aiConsents = { assertActive: jest.fn().mockResolvedValue(undefined) }
  const controller = new NeuropsychAssessmentsController(service as any, aiAnalysis as any, audit as any, aiConsents as any)
  return { controller, service, aiAnalysis, audit, aiConsents }
}

function req(userId = 'psychologist-1') {
  return { user: { id: userId, email: 'psi@exemplo.com', name: 'Psi', crp: '01/12345' }, headers: {}, socket: {} }
}

describe('NeuropsychAssessmentsController — autorização', () => {
  it('protege todas as rotas com autenticação, CSRF, anti-impersonação e plano pro', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA_KEY, NeuropsychAssessmentsController) as unknown[]
    expect(guards).toContain(JwtAuthGuard)
    expect(guards).toContain(CsrfGuard)
    expect(guards).toContain(NoImpersonationGuard)
    expect(Reflect.getMetadata(PLAN_KEY, NeuropsychAssessmentsController)).toBe('pro')
  })
})

describe('NeuropsychAssessmentsController — auditoria e repasse ao service', () => {
  it('list() repassa o usuário e os filtros de query ao service', async () => {
    const { controller, service } = makeController()
    const query = { status: 'completed' as const }
    await controller.list(query as any, req())
    expect(service.list).toHaveBeenCalledWith('psychologist-1', query)
  })

  it('findOne() busca pelo dono e registra auditoria de visualização', async () => {
    const { controller, service, audit } = makeController()
    const result = await controller.findOne('assessment-1', req())
    expect(service.findOne).toHaveBeenCalledWith('assessment-1', 'psychologist-1')
    expect(result).toEqual({ id: 'assessment-1', patientId: 'patient-1' })
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'psychologist-1', action: 'neuropsych_assessment.viewed', resource: 'neuropsych_assessment', resourceId: 'assessment-1',
    }))
  })

  it('create() usa o usuário autenticado, nunca um psychologistId do corpo', async () => {
    const { controller, service, audit } = makeController()
    const body = { patientId: 'patient-1' } as any
    await controller.create(body, req())
    expect(service.create).toHaveBeenCalledWith(body, 'psychologist-1')
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'neuropsych_assessment.created' }))
  })

  it('removeItem() encaminha os três IDs de path e audita a remoção', async () => {
    const { controller, service, audit } = makeController()
    await controller.removeItem('assessment-1', 'item-1', req())
    expect(service.removeItem).toHaveBeenCalledWith('assessment-1', 'item-1', 'psychologist-1')
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'neuropsych_assessment.battery_item_deleted', resourceId: 'assessment-1', metadata: { itemId: 'item-1' },
    }))
  })

  it('generateAiAnalysis() exige consentimento ativo antes de chamar o service de IA', async () => {
    const { controller, aiAnalysis, aiConsents, audit } = makeController()
    await controller.generateAiAnalysis('assessment-1', { fields: ['referralQuestion'] } as any, req())
    expect(aiConsents.assertActive).toHaveBeenCalledWith('psychologist-1', 'neuropsych_ai')
    expect(aiAnalysis.generate).toHaveBeenCalledWith('assessment-1', ['referralQuestion'], 'psychologist-1', 'psi@exemplo.com')
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'neuropsych_ai_analysis.requested', resource: 'neuropsych_ai_analysis',
    }))
  })

  it('createShareLink() gera o link em nome do dono da avaliação e audita a criação', async () => {
    const { controller, service, audit } = makeController()
    const result = await controller.createShareLink('assessment-1', req())
    expect(service.createShareLink).toHaveBeenCalledWith('assessment-1', 'psychologist-1')
    expect(result).toEqual({ url: 'https://usecognia.com.br/laudo/token-abc' })
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'neuropsych_assessment.share_link_created' }))
  })

  it('revokeShareLink() revoga em nome do dono da avaliação e audita a revogação', async () => {
    const { controller, service, audit } = makeController()
    await controller.revokeShareLink('assessment-1', req())
    expect(service.revokeShareLink).toHaveBeenCalledWith('assessment-1', 'psychologist-1')
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'neuropsych_assessment.share_link_revoked' }))
  })

  it('exportPdf() gera o laudo com nome e CRP do usuário autenticado e envia como PDF anexo', async () => {
    const { controller, service, audit } = makeController()
    const res = { set: jest.fn(), headersSent: false, status: jest.fn(), end: jest.fn() }
    await controller.exportPdf('assessment-1', req(), res as any)
    expect(service.exportPdf).toHaveBeenCalledWith('assessment-1', 'psychologist-1', 'Psi', '01/12345')
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({ 'Content-Type': 'application/pdf' }))
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'neuropsych_assessment.exported' }))
  })
})
