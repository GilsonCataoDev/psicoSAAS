import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { NoImpersonationGuard } from './no-impersonation.guard'

// Chave interna do Nest onde @UseGuards armazena os guards.
const GUARDS_METADATA = '__guards__'

function ctxWithUser(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext
}

function guardsOf(target: any): any[] {
  return Reflect.getMetadata(GUARDS_METADATA, target) ?? []
}

describe('NoImpersonationGuard — comportamento', () => {
  const guard = new NoImpersonationGuard()

  it('permite acesso de usuário normal (sem impersonação)', () => {
    expect(guard.canActivate(ctxWithUser({ id: 'u1' }))).toBe(true)
  })

  it('permite quando não há usuário (rota pública)', () => {
    expect(guard.canActivate(ctxWithUser(undefined))).toBe(true)
  })

  it('BLOQUEIA quando um admin está impersonando outro usuário', () => {
    expect(() => guard.canActivate(ctxWithUser({ id: 'vitima', impersonatedBy: 'admin-1' })))
      .toThrow(ForbiddenException)
  })
})

/**
 * Testes de fiação (wiring): provam que o guard REALMENTE está pendurado nos
 * endpoints clínicos. Sem isso, o guard poderia funcionar em unidade mas nunca
 * ser aplicado a uma rota — o teste falharia se alguém removesse a proteção.
 *
 * Importante: NoImpersonationGuard deve vir DEPOIS de JwtAuthGuard no array,
 * pois depende de req.user (populado pelo JwtAuthGuard). Os testes verificam
 * tanto a presença quanto a ordem.
 */
describe('NoImpersonationGuard — aplicado aos endpoints clínicos', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { SessionsController } = require('../../modules/sessions/sessions.controller')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PatientAttachmentsController } = require('../../modules/patients/patient-attachments.controller')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PatientsController } = require('../../modules/patients/patients.controller')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DocumentsController } = require('../../modules/documents/documents.controller')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { InstrumentAssignmentsController } = require('../../modules/instrument-assignments/instrument-assignments.controller')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { JwtAuthGuard } = require('../../modules/auth/guards/jwt-auth.guard')

  const hasNoImpersonation = (g: any[]) => g.includes(NoImpersonationGuard)
  const orderOk = (g: any[]) => g.indexOf(NoImpersonationGuard) > g.indexOf(JwtAuthGuard)

  it('Sessões (prontuário) — guard de classe presente e após JwtAuthGuard', () => {
    const g = guardsOf(SessionsController)
    expect(hasNoImpersonation(g)).toBe(true)
    expect(orderOk(g)).toBe(true)
  })

  it('Anexos de paciente — guard de classe presente e após JwtAuthGuard', () => {
    const g = guardsOf(PatientAttachmentsController)
    expect(hasNoImpersonation(g)).toBe(true)
    expect(orderOk(g)).toBe(true)
  })

  it('Paciente: detalhe (prontuário) bloqueado; exportação de prontuário bloqueada', () => {
    expect(hasNoImpersonation(guardsOf(PatientsController.prototype.findOne))).toBe(true)
    expect(hasNoImpersonation(guardsOf(PatientsController.prototype.exportProntuario))).toBe(true)
  })

  it('Paciente: listagem (findAll) permanece acessível ao suporte durante impersonação', () => {
    // findAll herda só os guards de classe (JwtAuthGuard, CsrfGuard) — sem NoImpersonation.
    expect(hasNoImpersonation(guardsOf(PatientsController.prototype.findAll))).toBe(false)
  })

  it('Documentos: listar, abrir e gerar PDF bloqueados durante impersonação', () => {
    expect(hasNoImpersonation(guardsOf(DocumentsController.prototype.findMine))).toBe(true)
    expect(hasNoImpersonation(guardsOf(DocumentsController.prototype.findOne))).toBe(true)
    expect(hasNoImpersonation(guardsOf(DocumentsController.prototype.pdf))).toBe(true)
  })

  it('Documentos: verificação pública permanece aberta (sem o guard)', () => {
    expect(hasNoImpersonation(guardsOf(DocumentsController.prototype.verify))).toBe(false)
  })

  it('Instrumentos: leitura de respostas bloqueada durante impersonação', () => {
    expect(hasNoImpersonation(guardsOf(InstrumentAssignmentsController.prototype.findMine))).toBe(true)
  })
})
