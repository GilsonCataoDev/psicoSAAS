import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { NoImpersonationGuard } from './no-impersonation.guard'

const GUARDS_METADATA = '__guards__'

function ctxWithUser(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext
}

function guardsOf(target: any): any[] {
  return Reflect.getMetadata(GUARDS_METADATA, target) ?? []
}

describe('NoImpersonationGuard - comportamento', () => {
  const guard = new NoImpersonationGuard()

  it('permite usuario normal', () => {
    expect(guard.canActivate(ctxWithUser({ id: 'u1' }))).toBe(true)
  })

  it('permite rota publica sem usuario', () => {
    expect(guard.canActivate(ctxWithUser(undefined))).toBe(true)
  })

  it('bloqueia admin impersonando outro usuario', () => {
    expect(() => guard.canActivate(ctxWithUser({ id: 'vitima', impersonatedBy: 'admin-1' })))
      .toThrow(ForbiddenException)
  })
})

describe('NoImpersonationGuard - aplicado aos dados sensiveis', () => {
  const { SessionsController } = require('../../modules/sessions/sessions.controller')
  const { PatientAttachmentsController } = require('../../modules/patients/patient-attachments.controller')
  const { PatientsController } = require('../../modules/patients/patients.controller')
  const { DocumentsController } = require('../../modules/documents/documents.controller')
  const { InstrumentAssignmentsController } = require('../../modules/instrument-assignments/instrument-assignments.controller')
  const { DataExportController } = require('../../modules/data-export/data-export.controller')
  const { BookingController } = require('../../modules/booking/booking.controller')
  const { AppointmentsController } = require('../../modules/appointments/appointments.controller')
  const { FinancialController } = require('../../modules/financial/financial.controller')
  const { JwtAuthGuard } = require('../../modules/auth/guards/jwt-auth.guard')

  const hasNoImpersonation = (guards: any[]) => guards.includes(NoImpersonationGuard)
  const orderOk = (guards: any[]) => guards.indexOf(NoImpersonationGuard) > guards.indexOf(JwtAuthGuard)

  it.each([
    ['sessoes', SessionsController],
    ['anexos', PatientAttachmentsController],
    ['pacientes', PatientsController],
    ['exportacao integral', DataExportController],
    ['agendamentos publicos privados', BookingController],
    ['agenda', AppointmentsController],
    ['financeiro', FinancialController],
  ])('%s possui bloqueio de classe depois da autenticacao', (_label, controller) => {
    const guards = guardsOf(controller)
    expect(hasNoImpersonation(guards)).toBe(true)
    expect(orderOk(guards)).toBe(true)
  })

  it('bloqueia todas as operacoes autenticadas de documentos', () => {
    for (const method of ['create', 'findMine', 'findOne', 'pdf', 'sendEmail', 'remove']) {
      expect(hasNoImpersonation(guardsOf(DocumentsController.prototype[method]))).toBe(true)
    }
    expect(hasNoImpersonation(guardsOf(DocumentsController.prototype.verify))).toBe(false)
  })

  it('bloqueia todas as operacoes autenticadas de instrumentos', () => {
    for (const method of ['findMine', 'create', 'updateAnswers']) {
      expect(hasNoImpersonation(guardsOf(InstrumentAssignmentsController.prototype[method]))).toBe(true)
    }
  })
})
