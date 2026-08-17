import 'reflect-metadata'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { PUBLIC_ROUTE_KEY } from '../../common/decorators/public-route.decorator'
import { PLAN_KEY } from '../../common/decorators/require-plan.decorator'
import { InstrumentAssignmentsController } from './instrument-assignments.controller'

const GUARDS_METADATA_KEY = '__guards__'

function makeController() {
  const svc = {
    findMine: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: 'assignment-1' }),
    updateAnswers: jest.fn().mockResolvedValue({ ok: true }),
    findSchedules: jest.fn().mockResolvedValue([]),
    setScheduleActive: jest.fn().mockResolvedValue({ ok: true }),
    deleteSchedule: jest.fn().mockResolvedValue({ ok: true }),
    findOwned: jest.fn().mockResolvedValue({ id: 'assignment-1' }),
    getPublic: jest.fn().mockResolvedValue({ title: 'Escala' }),
    submit: jest.fn().mockResolvedValue({ ok: true }),
  }
  const ai = { generateAssessmentInterpretation: jest.fn() }
  const aiTextQuota = { reserve: jest.fn().mockResolvedValue(undefined), release: jest.fn().mockResolvedValue(undefined), recordUsage: jest.fn().mockResolvedValue(undefined) }
  const controller = new InstrumentAssignmentsController(svc as any, ai as any, aiTextQuota as any)
  return { controller, svc, ai, aiTextQuota }
}

function req(userId = 'psychologist-1') {
  return { user: { id: userId, email: 'psi@exemplo.com' } }
}

describe('InstrumentAssignmentsController — autorização por rota', () => {
  const authenticatedMethods = ['findMine', 'create', 'updateAnswers', 'generateAiInterpretation', 'findSchedules', 'setScheduleActive', 'deleteSchedule']

  it.each(authenticatedMethods)('%s exige JwtAuthGuard, anti-impersonação e plano pro', methodName => {
    const guards = Reflect.getMetadata(GUARDS_METADATA_KEY, InstrumentAssignmentsController.prototype[methodName as keyof InstrumentAssignmentsController]) as unknown[]
    expect(guards).toContain(JwtAuthGuard)
    expect(guards).toContain(NoImpersonationGuard)
    expect(Reflect.getMetadata(PLAN_KEY, InstrumentAssignmentsController.prototype[methodName as keyof InstrumentAssignmentsController])).toBe('pro')
  })

  it.each(['create', 'updateAnswers', 'generateAiInterpretation', 'setScheduleActive', 'deleteSchedule'])('%s exige CsrfGuard (rota com efeito colateral)', methodName => {
    const guards = Reflect.getMetadata(GUARDS_METADATA_KEY, InstrumentAssignmentsController.prototype[methodName as keyof InstrumentAssignmentsController]) as unknown[]
    expect(guards).toContain(CsrfGuard)
  })

  it.each(['getPublic', 'submit'])('%s é rota pública, sem guard de autenticação', methodName => {
    const guards = Reflect.getMetadata(GUARDS_METADATA_KEY, InstrumentAssignmentsController.prototype[methodName as keyof InstrumentAssignmentsController]) as unknown[] | undefined
    expect(guards ?? []).not.toContain(JwtAuthGuard)
    expect(Reflect.getMetadata(PUBLIC_ROUTE_KEY, InstrumentAssignmentsController.prototype[methodName as keyof InstrumentAssignmentsController])).toBe(true)
  })
})

describe('InstrumentAssignmentsController — repasse ao service', () => {
  it('findMine() usa o usuário autenticado e o filtro opcional de paciente', async () => {
    const { controller, svc } = makeController()
    await controller.findMine(req(), 'patient-1')
    expect(svc.findMine).toHaveBeenCalledWith('psychologist-1', 'patient-1')
  })

  it('create() associa o registro ao psicólogo autenticado', async () => {
    const { controller, svc } = makeController()
    const body = { patientId: 'patient-1', instrumentId: 'inst-1', title: 'Título', category: 'anxiety', template: '{}' } as any
    await controller.create(req(), body)
    expect(svc.create).toHaveBeenCalledWith(body, 'psychologist-1')
  })

  it('generateAiInterpretation() confirma posse do registro antes de gastar cota de IA', async () => {
    const { controller, svc, aiTextQuota, ai } = makeController()
    ai.generateAssessmentInterpretation.mockResolvedValue({ text: 'rascunho', usage: { tokens: 10 } })
    const body = { scaleName: 'BDI-II', scoreDetails: { score: 20 }, criticalFlags: [] } as any
    const result = await controller.generateAiInterpretation(req(), 'assignment-1', body)
    expect(svc.findOwned).toHaveBeenCalledWith('assignment-1', 'psychologist-1')
    expect(aiTextQuota.reserve).toHaveBeenCalledWith('psychologist-1', 'psi@exemplo.com')
    expect(aiTextQuota.recordUsage).toHaveBeenCalledWith('psychologist-1', { tokens: 10 })
    expect(result).toEqual({ draft: 'rascunho', criticalAlert: null })
  })

  it('generateAiInterpretation() libera a cota reservada se a chamada de IA falhar', async () => {
    const { controller, svc, aiTextQuota, ai } = makeController()
    ai.generateAssessmentInterpretation.mockRejectedValue(new Error('falha do provedor'))
    const body = { scaleName: 'BDI-II', scoreDetails: { score: 20 }, criticalFlags: [] } as any
    await expect(controller.generateAiInterpretation(req(), 'assignment-1', body)).rejects.toThrow('falha do provedor')
    expect(aiTextQuota.release).toHaveBeenCalledWith('psychologist-1')
  })

  it('submit() (rota pública) repassa o token sem exigir usuário autenticado', async () => {
    const { controller, svc } = makeController()
    await controller.submit('token-abc', { q1: 'resposta' }, 10, 'detalhes')
    expect(svc.submit).toHaveBeenCalledWith('token-abc', { q1: 'resposta' }, 10, 'detalhes')
  })
})
