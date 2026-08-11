import { AppointmentsService } from './appointments.service'

function buildService(overrides: { record?: any } = {}) {
  // O mesmo objeto e retornado em toda chamada a findOne, imitando persistencia:
  // Object.assign(appointment, dto) dentro do service muta esta referencia direto.
  const record: any = overrides.record ?? {
    id: 'appt-1',
    psychologistId: 'psi-1',
    patientId: 'patient-1',
    date: '2026-08-10',
    time: '14:00',
    duration: 50,
    modality: 'presencial',
    meetingUrl: undefined,
  }
  const repo = {
    findOne: jest.fn().mockImplementation(async () => record),
    save: jest.fn().mockImplementation(async (value: any) => value),
    createQueryBuilder: jest.fn(() => {
      const qb: any = {}
      qb.where = () => qb
      qb.andWhere = () => qb
      qb.getOne = async () => null
      return qb
    }),
  }
  const bookings = {
    findOne: jest.fn().mockResolvedValue(null),
    createQueryBuilder: jest.fn(() => {
      const qb: any = {}
      qb.where = () => qb
      qb.andWhere = () => qb
      qb.getOne = async () => null
      return qb
    }),
  }
  const patients = {}
  const sessions = {}
  const financial = {}
  const manager = {
    save: jest.fn(async (_entity: any, value: any) => repo.save(value)),
  }
  const dataSource = {
    transaction: jest.fn(async (callback: (manager: any) => Promise<any>) => callback(manager)),
  }
  const notifications = { supersedeAppointmentReminders: jest.fn().mockResolvedValue(undefined) }
  const googleCalendar = { syncAppointment: jest.fn().mockResolvedValue(undefined) }

  const service = new AppointmentsService(
    repo as any, bookings as any, patients as any, sessions as any, financial as any,
    dataSource as any, notifications as any, googleCalendar as any,
  )
  return { service, repo, bookings, notifications, dataSource, manager }
}

describe('AppointmentsService — sala de vídeo automática (Jitsi)', () => {
  it('gera uma sala Jitsi ao atualizar um agendamento presencial para online sem link', async () => {
    const { service, repo } = buildService()

    const result = await service.update('appt-1', { modality: 'online' } as any, 'psi-1')

    expect(repo.save).toHaveBeenCalled()
    const saved = repo.save.mock.calls[0][0]
    expect(saved.modality).toBe('online')
    expect(saved.meetingUrl).toMatch(/^https:\/\/meet\.jit\.si\/UseCognia-[a-f0-9]{32}$/)
    expect(result.meetingUrl).toBe(saved.meetingUrl)
  })

  it('não sobrescreve um link manual já informado', async () => {
    const { service, repo } = buildService()

    await service.update(
      'appt-1',
      { modality: 'online', meetingUrl: 'https://meet.google.com/abc-defg-hij' } as any,
      'psi-1',
    )

    const saved = repo.save.mock.calls[0][0]
    expect(saved.meetingUrl).toBe('https://meet.google.com/abc-defg-hij')
  })

  it('não gera sala quando o agendamento continua presencial', async () => {
    const { service, repo } = buildService()

    await service.update('appt-1', { notes: 'Trouxe um relatório médico' } as any, 'psi-1')

    const saved = repo.save.mock.calls[0][0]
    expect(saved.meetingUrl).toBeUndefined()
  })

  it('não gera sala quando autoVideoRoom é desativado e nenhum link foi informado', async () => {
    const { service, repo } = buildService()

    await service.update('appt-1', { modality: 'online', autoVideoRoom: false } as any, 'psi-1')

    const saved = repo.save.mock.calls[0][0]
    expect(saved.meetingUrl).toBeUndefined()
  })

  it('gera salas Jitsi únicas a cada chamada', async () => {
    const { service } = buildService()
    const { service: service2 } = buildService()

    const r1 = await service.update('appt-1', { modality: 'online' } as any, 'psi-1')
    const r2 = await service2.update('appt-1', { modality: 'online' } as any, 'psi-1')

    expect(r1.meetingUrl).not.toBe(r2.meetingUrl)
  })

  it('supersedes reminders and saves the rescheduled appointment in one transaction', async () => {
    const { service, notifications, dataSource, manager } = buildService()

    await service.update('appt-1', { date: '2026-08-11', time: '15:00' } as any, 'psi-1')

    expect(dataSource.transaction).toHaveBeenCalledTimes(1)
    expect(notifications.supersedeAppointmentReminders).toHaveBeenCalledWith('appt-1', manager)
    expect(manager.save).toHaveBeenCalled()
  })
})

function buildGroupService() {
  const records: any[] = [
    { id: 'appt-1', psychologistId: 'psi-1', recurringGroupId: 'group-1', date: '2026-08-11', time: '09:00', duration: 50, modality: 'presencial', meetingUrl: undefined },
    { id: 'appt-2', psychologistId: 'psi-1', recurringGroupId: 'group-1', date: '2026-08-18', time: '09:00', duration: 50, modality: 'presencial', meetingUrl: undefined },
  ]
  const noConflictQb = () => {
    const qb: any = {}
    qb.where = () => qb
    qb.andWhere = () => qb
    qb.getOne = async () => null
    return qb
  }
  const repo = {
    find: jest.fn().mockResolvedValue(records),
    save: jest.fn().mockImplementation(async (value: any) => value),
    createQueryBuilder: jest.fn(() => noConflictQb()),
  }
  const bookings = {
    findOne: jest.fn().mockResolvedValue(null),
    createQueryBuilder: jest.fn(() => noConflictQb()),
  }
  const patients = {}
  const sessions = {}
  const financial = {}
  const manager = {
    save: jest.fn(async (_entity: any, value: any) => repo.save(value)),
  }
  const dataSource = {
    transaction: jest.fn(async (callback: (manager: any) => Promise<any>) => callback(manager)),
  }
  const notifications = { supersedeAppointmentReminders: jest.fn().mockResolvedValue(undefined) }
  const googleCalendar = { syncAppointment: jest.fn().mockResolvedValue(undefined) }

  const service = new AppointmentsService(
    repo as any, bookings as any, patients as any, sessions as any, financial as any,
    dataSource as any, notifications as any, googleCalendar as any,
  )
  return { service, repo, records, dataSource, manager, notifications }
}

describe('AppointmentsService — updateStatus (lançamento financeiro ao concluir)', () => {
  function buildCompletionService(patient: any = { id: 'patient-1', billingType: 'session', sessionPrice: 150, name: 'Fulana' }) {
    const record: any = {
      id: 'appt-1',
      psychologistId: 'psi-1',
      patientId: 'patient-1',
      date: '2026-08-10',
      time: '14:00',
      duration: 50,
      modality: 'presencial',
      status: 'scheduled',
    }
    const repo = {
      findOne: jest.fn().mockImplementation(async () => record),
      save: jest.fn().mockImplementation(async (value: any) => value),
    }
    const bookings = { findOne: jest.fn().mockResolvedValue(null) }
    const patients = { findOne: jest.fn().mockResolvedValue(patient) }
    const sessions = {}
    const financial = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((v: any) => v),
      save: jest.fn().mockResolvedValue(undefined),
    }
    const dataSource = {}
    const notifications = {}
    const googleCalendar = { syncAppointment: jest.fn().mockResolvedValue(undefined), deleteAppointment: jest.fn().mockResolvedValue(undefined) }

    const service = new AppointmentsService(
      repo as any, bookings as any, patients as any, sessions as any, financial as any,
      dataSource as any, notifications as any, googleCalendar as any,
    )
    return { service, financial, patients }
  }

  it('cria lançamento pendente ao marcar como concluída uma sessão avulsa sem prontuário', async () => {
    const { service, financial } = buildCompletionService()

    await service.updateStatus('appt-1', 'completed', 'psi-1')

    expect(financial.create).toHaveBeenCalledWith(expect.objectContaining({
      type: 'income',
      amount: 150,
      status: 'pending',
      appointmentId: 'appt-1',
      patientId: 'patient-1',
    }))
    expect(financial.save).toHaveBeenCalled()
  })

  it('não cria lançamento para paciente de pacote mensal (já gerado pelo job diário)', async () => {
    const { service, financial } = buildCompletionService({ id: 'patient-1', billingType: 'monthly_package', sessionPrice: 150 })

    await service.updateStatus('appt-1', 'completed', 'psi-1')

    expect(financial.create).not.toHaveBeenCalled()
  })

  it('não duplica lançamento se já existe um vinculado ao agendamento', async () => {
    const { service, financial } = buildCompletionService()
    financial.findOne.mockResolvedValue({ id: 'fin-1' })

    await service.updateStatus('appt-1', 'completed', 'psi-1')

    expect(financial.create).not.toHaveBeenCalled()
  })

  it('não cria lançamento quando o paciente não tem valor de sessão configurado', async () => {
    const { service, financial } = buildCompletionService({ id: 'patient-1', billingType: 'session', sessionPrice: 0 })

    await service.updateStatus('appt-1', 'completed', 'psi-1')

    expect(financial.create).not.toHaveBeenCalled()
  })
})

describe('AppointmentsService — updateGroup (esta e as próximas)', () => {
  it('desloca a data de todas as ocorrências futuras pelo mesmo número de dias que a âncora foi movida', async () => {
    const { service, repo } = buildGroupService()

    const result = await service.updateGroup('group-1', '2026-08-11', { date: '2026-08-12', time: '09:00' } as any, 'psi-1')

    expect(result.updated).toBe(2)
    const saved = repo.save.mock.calls[0][0]
    expect(saved.find((a: any) => a.id === 'appt-1').date).toBe('2026-08-12')
    expect(saved.find((a: any) => a.id === 'appt-2').date).toBe('2026-08-19')
  })

  it('mantém a data original quando nenhuma nova data é enviada', async () => {
    const { service, repo } = buildGroupService()

    await service.updateGroup('group-1', '2026-08-11', { time: '10:00' } as any, 'psi-1')

    const saved = repo.save.mock.calls[0][0]
    expect(saved.find((a: any) => a.id === 'appt-1').date).toBe('2026-08-11')
    expect(saved.find((a: any) => a.id === 'appt-2').date).toBe('2026-08-18')
  })
})
