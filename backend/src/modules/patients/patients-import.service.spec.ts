import { PatientsImportService, IMPORT_MAX_ROWS } from './patients-import.service'

process.env.ENCRYPTION_KEY = 'patients-import-test-encryption-key-32!'

function csv(rows: string[]): Buffer {
  return Buffer.from(rows.join('\r\n') + '\r\n', 'utf-8')
}

function makeService(opts: {
  existing?: Array<{ id: string; name: string; cpfCnpj?: string; email?: string }>
  remainingSlots?: number
  plan?: string
} = {}) {
  const existing = opts.existing ?? []
  const repo = {
    find: jest.fn().mockResolvedValue(existing),
    create: jest.fn((data: any) => data),
    save: jest.fn(async (entities: any[]) => entities.map((e, i) => ({ ...e, id: e.id ?? `new-${i}` }))),
  }
  const patients = {
    getPlanUsage: jest.fn().mockResolvedValue({ plan: opts.plan ?? 'free', limit: 10, count: 0 }),
    getRemainingPatientSlots: jest.fn().mockResolvedValue(opts.remainingSlots ?? Number.MAX_SAFE_INTEGER),
    encryptFields: jest.fn((dto: any) => ({ ...dto })),
  }
  const service = new PatientsImportService(repo as any, patients as any)
  return { service, repo, patients }
}

describe('PatientsImportService', () => {
  it('importa uma linha válida, convertendo data BR e valor com vírgula', async () => {
    const { service, repo } = makeService()
    const file = csv([
      'Nome completo,E-mail,Data de nascimento,Valor da sessão (R$)',
      'Maria da Silva,maria@example.com,15/03/1990,"150,00"',
    ])

    const result = await service.import(file, 'psy-1')

    expect(result.errorCount).toBe(0)
    expect(result.importedCount).toBe(1)
    expect(repo.save).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'Maria da Silva',
        email: 'maria@example.com',
        birthDate: '1990-03-15',
        sessionPrice: 150,
        psychologistId: 'psy-1',
        status: 'active',
      }),
    ])
  })

  it('reporta erro de validação por linha (CPF inválido) sem travar o restante', async () => {
    const { service } = makeService()
    const file = csv([
      'Nome completo,CPF ou CNPJ',
      'Paciente A,123',
      'Paciente B,',
    ])

    const result = await service.import(file, 'psy-1')

    expect(result.errorCount).toBe(1)
    expect(result.errors[0]).toEqual(expect.objectContaining({ row: 2, name: 'Paciente A' }))
    expect(result.importedCount).toBe(1)
  })

  it('pula duplicata já existente no banco (por CPF/CNPJ)', async () => {
    const { service } = makeService({
      existing: [{ id: 'existing-1', name: 'Já Cadastrado', cpfCnpj: '12345678901' }],
    })
    const file = csv([
      'Nome completo,CPF ou CNPJ',
      'Novo Nome,123.456.789-01',
    ])

    const result = await service.import(file, 'psy-1')

    expect(result.skippedCount).toBe(1)
    expect(result.skipped[0].reason).toBe('duplicate')
    expect(result.importedCount).toBe(0)
  })

  it('pula duplicata dentro do próprio arquivo (por e-mail)', async () => {
    const { service } = makeService()
    const file = csv([
      'Nome completo,E-mail',
      'Pessoa 1,dup@example.com',
      'Pessoa 2,dup@example.com',
    ])

    const result = await service.import(file, 'psy-1')

    expect(result.importedCount).toBe(1)
    expect(result.skippedCount).toBe(1)
    expect(result.skipped[0].reason).toBe('duplicate')
  })

  it('trunca pelo limite de vagas do plano e sinaliza upgrade', async () => {
    const { service } = makeService({ remainingSlots: 1, plan: 'free' })
    const file = csv([
      'Nome completo',
      'Paciente 1',
      'Paciente 2',
    ])

    const result = await service.import(file, 'psy-1')

    expect(result.importedCount).toBe(1)
    expect(result.skipped).toEqual([
      expect.objectContaining({ row: 3, reason: 'plan_limit_reached' }),
    ])
    expect(result.upgradeUrl).toBe('/planos')
    expect(result.currentPlan).toBe('free')
  })

  it('reaproveita encryptFields do PatientsService antes de persistir', async () => {
    const { service, patients } = makeService()
    const file = csv([
      'Nome completo,Observações',
      'Paciente X,nota sensível',
    ])

    await service.import(file, 'psy-1')

    expect(patients.encryptFields).toHaveBeenCalledWith(
      expect.objectContaining({ privateNotes: 'nota sensível' }),
    )
  })

  it('rejeita arquivo vazio', async () => {
    const { service } = makeService()
    await expect(service.import(csv(['Nome completo']), 'psy-1')).rejects.toThrow('vazio')
  })

  it('rejeita arquivo acima do teto de linhas', async () => {
    const { service } = makeService()
    const rows = ['Nome completo', ...Array.from({ length: IMPORT_MAX_ROWS + 1 }, (_, i) => `Paciente ${i}`)]
    await expect(service.import(csv(rows), 'psy-1')).rejects.toThrow(String(IMPORT_MAX_ROWS))
  })
})
