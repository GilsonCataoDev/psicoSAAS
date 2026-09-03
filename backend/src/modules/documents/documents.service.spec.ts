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

describe('DocumentsService.create — tipos privativos de psicologia', () => {
  // Relatório e atestado psicológicos são atos regulados pela Res. CFP 06/2019.
  // O frontend esconde os tipos, mas esconder no navegador não é controle.
  for (const type of ['relatorio', 'atestado'] as const) {
    it(`recusa ${type} quando a conta não é de psicologia`, async () => {
      const { svc } = createService()
      const nutricionista = makeUser({ crp: null, isStudent: false, profession: 'nutricao' })

      await expect(svc.create(nutricionista, {
        patientId: 'p1', patientName: 'Cliente Teste', type,
        title: 'Documento', content: 'conteúdo qualquer preenchido',
      }, '127.0.0.1')).rejects.toThrow(BadRequestException)
    })
  }

  it('permite os tipos neutros para profissões não-psicologia', async () => {
    const { svc, repo, planAccess } = createService()
    planAccess.getCurrentPlan.mockResolvedValue('pro')
    const nutricionista = makeUser({ crp: null, isStudent: false, profession: 'nutricao' })

    const result = await svc.create(nutricionista, {
      patientId: 'p1', patientName: 'Cliente Teste', type: 'declaracao',
      title: 'Declaração', content: 'conteúdo qualquer preenchido',
    }, '127.0.0.1')

    expect(result).toBeDefined()
    expect(repo.save).toHaveBeenCalled()
  })

  it('psicologia continua emitindo relatório normalmente', async () => {
    const { svc, planAccess } = createService()
    planAccess.getCurrentPlan.mockResolvedValue('pro')
    const psicologo = makeUser({ crp: '06/123456', isStudent: false, profession: 'psicologia' })

    const result = await svc.create(psicologo, {
      patientId: 'p1', patientName: 'Paciente Teste', type: 'relatorio',
      title: 'Relatório', content: 'conteúdo qualquer preenchido',
    }, '127.0.0.1')

    expect(result).toBeDefined()
  })
})
