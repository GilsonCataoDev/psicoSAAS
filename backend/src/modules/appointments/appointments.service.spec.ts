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
  }
  const bookings = { findOne: jest.fn().mockResolvedValue(null) }
  const patients = {}
  const sessions = {}
  const financial = {}
  const dataSource = {}
  const notifications = {}
  const googleCalendar = { syncAppointment: jest.fn().mockResolvedValue(undefined) }

  const service = new AppointmentsService(
    repo as any, bookings as any, patients as any, sessions as any, financial as any,
    dataSource as any, notifications as any, googleCalendar as any,
  )
  return { service, repo, bookings }
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

  it('gera salas Jitsi únicas a cada chamada', async () => {
    const { service } = buildService()
    const { service: service2 } = buildService()

    const r1 = await service.update('appt-1', { modality: 'online' } as any, 'psi-1')
    const r2 = await service2.update('appt-1', { modality: 'online' } as any, 'psi-1')

    expect(r1.meetingUrl).not.toBe(r2.meetingUrl)
  })
})
