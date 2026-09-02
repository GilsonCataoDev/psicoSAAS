process.env.ENCRYPTION_KEY = 'documents-test-encryption-key-32-chars!'

import { BadRequestException } from '@nestjs/common'
import { DocumentsService } from './documents.service'
import { User } from '../auth/entities/user.entity'

function mockRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((dto: any) => dto),
    save: jest.fn((entity: any) => Promise.resolve({ ...entity, id: 'doc-1' })),
    count: jest.fn().mockResolvedValue(0),
    ...overrides,
  }
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1', name: 'Ana Souza', crp: '06/123456', isStudent: false,
    ...overrides,
  } as User
}

function createService() {
  const repo = mockRepo()
  const cfg = { getOrThrow: jest.fn().mockReturnValue('a'.repeat(32)) }
  const email = { sendDocumentSigned: jest.fn().mockResolvedValue(undefined) }
  const planAccess = { getCurrentPlan: jest.fn().mockResolvedValue('free') }
  // verifyByCode consulta a profissão de quem assinou para resolver o rótulo do tipo.
  const users = { findOne: jest.fn().mockResolvedValue({ id: 'user-1', profession: 'psicologia' }) }

  const svc = new DocumentsService(repo as any, users as any, cfg as any, email as any, planAccess as any)
  return { svc, repo, planAccess, users }
}

describe('DocumentsService.create — guarda de CRP', () => {
  it('recusa gerar documento oficial quando o usuário não tem CRP (conta de estudante)', async () => {
    const { svc } = createService()
    const student = makeUser({ crp: null, isStudent: true })

    await expect(svc.create(student, {
      patientId: 'p1', patientName: 'Paciente Teste', type: 'declaracao',
      title: 'Declaração', content: 'conteúdo qualquer preenchido',
    }, '127.0.0.1')).rejects.toThrow(BadRequestException)
  })

  it('permite gerar documento quando o usuário tem CRP', async () => {
    const { svc, repo, planAccess } = createService()
    planAccess.getCurrentPlan.mockResolvedValue('pro')
    const professional = makeUser({ crp: '06/123456', isStudent: false })

    const result = await svc.create(professional, {
      patientId: 'p1', patientName: 'Paciente Teste', type: 'declaracao',
      title: 'Declaração', content: 'conteúdo qualquer preenchido',
    }, '127.0.0.1')

    expect(result).toBeDefined()
    expect(repo.save).toHaveBeenCalled()
  })
})
