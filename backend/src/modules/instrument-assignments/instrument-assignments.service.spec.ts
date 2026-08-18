import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { InstrumentAssignmentsService } from './instrument-assignments.service'
import { safeDecrypt } from '../../common/crypto/encrypt.util'

process.env.ENCRYPTION_KEY = 'instrument-assignments-test-key-32c'

function repo(overrides: Record<string, jest.Mock> = {}) {
  return {
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn(async (value: any) => value),
    ...overrides,
  }
}

function makeService(assignmentsRepo = repo()) {
  const schedules = repo()
  const patients = repo()
  const notifications = { sendInstrumentAssignment: jest.fn() }
  const config = { get: jest.fn() }
  return new InstrumentAssignmentsService(
    assignmentsRepo as any,
    schedules as any,
    patients as any,
    notifications as any,
    config as any,
  )
}

const TEMPLATE = `ESCALA DE TESTE

Item um:
Item dois:

PONTUAÇÃO TOTAL:`

function pendingAssignment(overrides: Partial<any> = {}) {
  return {
    id: 'assignment-1',
    token: 'token-hash',
    status: 'pending',
    expiresAt: new Date(Date.now() + 60_000),
    template: TEMPLATE,
    patient: { name: 'Paciente Teste' },
    ...overrides,
  }
}

describe('InstrumentAssignmentsService.submit — respostas de escala', () => {
  it('preserva as chaves originais (q1, q2...) quando a submissao inclui score calculado', async () => {
    const assignment = pendingAssignment()
    const assignments = repo({ findOne: jest.fn().mockResolvedValue(assignment) })
    const service = makeService(assignments)

    await service.submit('token-plano', { q1: '2', q2: '3' }, 5, JSON.stringify({ total: 5 }))

    const saved = assignments.save.mock.calls[0][0]
    const storedAnswers = JSON.parse(safeDecrypt(saved.responseData) ?? '{}')
    expect(storedAnswers).toEqual({ q1: '2', q2: '3' })
    expect(saved.score).toBe(5)
  })

  it('sem score, continua remapeando pelos campos extraidos do template (formularios genericos)', async () => {
    const assignment = pendingAssignment()
    const assignments = repo({ findOne: jest.fn().mockResolvedValue(assignment) })
    const service = makeService(assignments)

    await service.submit('token-plano', { field_0: 'Resposta A', field_1: 'Resposta B' })

    const saved = assignments.save.mock.calls[0][0]
    const storedAnswers = JSON.parse(safeDecrypt(saved.responseData) ?? '{}')
    expect(storedAnswers).toEqual({ field_0: 'Resposta A', field_1: 'Resposta B', field_2: '' })
    expect(saved.score).toBeUndefined()
  })

  it('rejeita submissao de formulario ja respondido ou expirado', async () => {
    const assignments = repo({ findOne: jest.fn().mockResolvedValue(pendingAssignment({ status: 'completed' })) })
    const service = makeService(assignments)
    await expect(service.submit('token-plano', { q1: '1' }, 1)).rejects.toThrow(ForbiddenException)
  })

  it('rejeita token inexistente', async () => {
    const assignments = repo({ findOne: jest.fn().mockResolvedValue(null) })
    const service = makeService(assignments)
    await expect(service.submit('token-invalido', {}, 1)).rejects.toThrow(NotFoundException)
  })
})
