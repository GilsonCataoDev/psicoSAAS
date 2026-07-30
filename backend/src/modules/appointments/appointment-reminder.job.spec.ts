import { AppointmentReminderJob } from './appointment-reminder.job'

describe('AppointmentReminderJob', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-07-26T12:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  function makeJob(appointments: any[], emailOverrides: Partial<any> = {}) {
    const appointmentsRepo = {
      find: jest.fn().mockResolvedValue(appointments),
      save: jest.fn(async item => item),
    }
    const usersRepo = { save: jest.fn(async item => item) }
    const notifications = {
      canUseWhatsAppAutomation: jest.fn().mockResolvedValue(true),
      sendAppointmentReminder: jest.fn(async appointment => (
        appointment.patient?.phone ? { sent: true } : { sent: false, error: 'Paciente sem WhatsApp' }
      )),
      sendAppointmentPushReminder: jest.fn(),
      sendDailyAgendaDigest: jest.fn(),
    }
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'GOOGLE_CALENDAR_TIMEZONE') return 'America/Sao_Paulo'
        if (key === 'APPOINTMENT_TIMEZONE_OFFSET') return '-03:00'
        return undefined
      }),
    }
    const email = {
      isRateLimited: jest.fn(() => false),
      getRateLimitRetryAfterMs: jest.fn(() => 60_000),
      sendSessionReminder: jest.fn(),
      ...emailOverrides,
    }
    const lock = { withLock: jest.fn(async (_key, fn) => fn()) }
    const heartbeat = { ping: jest.fn() }

    const job = new AppointmentReminderJob(
      appointmentsRepo as any,
      usersRepo as any,
      notifications as any,
      config as any,
      email as any,
      lock as any,
      heartbeat as any,
    )

    return { job, appointmentsRepo, notifications, email }
  }

  it('continua enviando WhatsApp para os proximos pacientes quando fallback por email esta limitado', async () => {
    const psychologist = { id: 'psy-1', name: 'Dra Ana', preferences: {} }
    const withoutPhone = {
      id: 'appt-1',
      date: '2026-07-26',
      time: '12:30',
      status: 'scheduled',
      psychologistId: 'psy-1',
      psychologist,
      patient: { id: 'pat-1', name: 'Marina', email: 'marina@example.com' },
    }
    const withPhone = {
      id: 'appt-2',
      date: '2026-07-26',
      time: '13:00',
      status: 'scheduled',
      psychologistId: 'psy-1',
      psychologist,
      patient: { id: 'pat-2', name: 'Julia', phone: '5585999999999' },
    }
    const { job, appointmentsRepo, notifications, email } = makeJob([withoutPhone, withPhone], {
      isRateLimited: jest.fn(() => true),
      sendSessionReminder: jest.fn().mockRejectedValue(new Error('rate limited')),
    })

    await (job as any).runLocked()

    expect(notifications.sendAppointmentReminder).toHaveBeenCalledTimes(2)
    expect(email.sendSessionReminder).toHaveBeenCalledTimes(1)
    expect(appointmentsRepo.save).toHaveBeenCalledTimes(1)
    expect(appointmentsRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'appt-2',
      reminder24hSentAt: expect.any(Date),
    }))
  })

  it('envia o lembrete curto somente quando falta no maximo 1h', async () => {
    const psychologist = { id: 'psy-1', name: 'Dra Ana', preferences: {} }
    const outsideWindow = {
      id: 'appt-outside',
      date: '2026-07-26',
      time: '10:30',
      status: 'scheduled',
      psychologistId: 'psy-1',
      psychologist,
      patient: { id: 'pat-1', name: 'Marina', phone: '5585999999999' },
      reminder24hSentAt: new Date(),
    }
    const insideWindow = {
      id: 'appt-inside',
      date: '2026-07-26',
      time: '09:45',
      status: 'scheduled',
      psychologistId: 'psy-1',
      psychologist,
      patient: { id: 'pat-2', name: 'Julia', phone: '5585999999999' },
      reminder24hSentAt: new Date(),
    }
    const { job, appointmentsRepo, notifications } = makeJob([outsideWindow, insideWindow])

    await (job as any).runLocked()

    expect(notifications.sendAppointmentReminder).toHaveBeenCalledTimes(1)
    expect(notifications.sendAppointmentReminder).toHaveBeenCalledWith(insideWindow, '1h')
    expect(appointmentsRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'appt-inside',
      reminder2hSentAt: expect.any(Date),
    }))
  })
})
