import { ConfigService } from '@nestjs/config'
import { NotificationsService } from './notifications.service'

process.env.ENCRYPTION_KEY = 'notifications-test-key-with-32-chars!'

function makeOutboxRepo() {
  const builder: any = {}
  builder.insert = jest.fn(() => builder)
  builder.values = jest.fn(() => builder)
  builder.orIgnore = jest.fn(() => builder)
  builder.returning = jest.fn(() => builder)
  builder.execute = jest.fn(async () => ({ raw: [{ id: 'outbox-id' }] }))
  return {
    createQueryBuilder: jest.fn(() => builder),
    manager: { query: jest.fn(async () => [[{ id: 'outbox-id' }], 1]) },
    find: jest.fn().mockResolvedValue([]),
    findOneOrFail: jest.fn(async () => ({ id: 'outbox-id', status: 'sending', attempts: 1 })),
    save: jest.fn(async (value: any) => value),
  }
}

const disabledCloudProvider = { isEnabledFor: jest.fn(() => false), isConfigured: jest.fn(() => false), send: jest.fn() }

describe('NotificationsService WhatsApp delivery validation', () => {
  const ownerId = 'psychologist-id'
  const savedLogs: Record<string, unknown>[] = []

  const cfg = {
    get: jest.fn((key: string) => ({
      FRONTEND_URL: 'https://usecognia.com.br',
      WHATSAPP_API_URL: 'https://evolution.test',
      WHATSAPP_API_KEY: 'test-api-key',
      WHATSAPP_INSTANCE_PREFIX: 'cognia',
    })[key]),
  } as unknown as ConfigService

  const users = {
    findOneBy: jest.fn().mockResolvedValue({ email: 'gilsonfilho96@outlook.com' }),
    // professionOf() consulta aqui para montar o vocabulario das mensagens.
    findOne: jest.fn().mockResolvedValue({ id: 'psychologist-id', profession: 'psicologia' }),
  }
  const planAccess = { hasAccess: jest.fn().mockResolvedValue(true) }
  const pushSubscriptions = { countBy: jest.fn() }
  const nativePushTokens = { countBy: jest.fn() }
  const whatsAppLogs = {
    create: jest.fn((value: Record<string, unknown>) => value),
    save: jest.fn(async (value: Record<string, unknown>) => {
      savedLogs.push(value)
      return value
    }),
  }
  const outboxEntity: any = { status: 'pending', attempts: 0 }
  const outboxBuilder: any = {}
  outboxBuilder.insert = jest.fn(() => outboxBuilder)
  outboxBuilder.values = jest.fn(() => outboxBuilder)
  outboxBuilder.orIgnore = jest.fn(() => outboxBuilder)
  outboxBuilder.returning = jest.fn(() => outboxBuilder)
  outboxBuilder.execute = jest.fn(async () => ({ raw: [{ id: 'outbox-id' }] }))
  const whatsAppOutbox = {
    createQueryBuilder: jest.fn(() => outboxBuilder),
    manager: { query: jest.fn(async () => [[{ id: 'outbox-id' }], 1]) },
    find: jest.fn().mockResolvedValue([]),
    findOneOrFail: jest.fn(async () => ({ ...outboxEntity })),
    save: jest.fn(async (value: any) => value),
  }
  const cloudWhatsApp = { isEnabledFor: jest.fn(() => false), isConfigured: jest.fn(() => false), send: jest.fn() }

  let service: NotificationsService

  beforeEach(() => {
    savedLogs.length = 0
    jest.clearAllMocks()
    whatsAppOutbox.manager.query.mockReset().mockResolvedValue([[{ id: 'outbox-id' }], 1])
    outboxBuilder.execute.mockReset().mockResolvedValue({ raw: [{ id: 'outbox-id' }] })
    whatsAppOutbox.findOneOrFail.mockReset().mockImplementation(async () => ({ ...outboxEntity }))
    users.findOneBy.mockResolvedValue({ email: 'gilsonfilho96@outlook.com' })
    service = new NotificationsService(
      cfg,
      {} as any,
      planAccess as any,
      users as any,
      pushSubscriptions as any,
      nativePushTokens as any,
      whatsAppLogs as any,
      whatsAppOutbox as any,
      cloudWhatsApp as any,
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('rejects a successful provider response whose echoed message is blank', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      key: { id: 'message-id', fromMe: true },
      message: { extendedTextMessage: { text: '' } },
      status: 'PENDING',
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }))

    const result = await service.sendDirectWhatsApp('11999999999', 'Mensagem preenchida', ownerId)

    expect(result.sent).toBe(false)
    expect(result.error).toContain('sem conteúdo')
    expect(savedLogs).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 'failed' }),
    ]))
  })

  it('records provider receipt metadata without storing the message body', async () => {
    const text = 'Confirmação preenchida'
    // mockImplementation (não mockResolvedValue) — cada chamada precisa de um
    // Response novo, já que o corpo só pode ser lido uma vez e este teste agora
    // dispara mais de uma chamada (reenvio automático por verificação inconclusiva).
    jest.spyOn(global, 'fetch').mockImplementation(async () => new Response(JSON.stringify({
      key: { id: 'provider-message-id', fromMe: true },
      message: { extendedTextMessage: { text } },
      status: 'PENDING',
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }))

    const result = await service.sendDirectWhatsApp('11999999999', text, ownerId)

    // providerStatus vira 'unverified' aqui porque a verificação de entrega é
    // pulada em ambiente de teste (JEST_WORKER_ID definido) — reflete
    // corretamente que o conteúdo persistido nunca foi checado, em vez de só
    // ecoar o status síncrono ('PENDING') do sendText, que não confirma entrega.
    expect(result).toEqual(expect.objectContaining({
      sent: true,
      providerMessageId: 'provider-message-id',
      providerStatus: 'unverified',
      contentLength: text.length,
    }))
    expect(savedLogs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        status: 'sent',
        providerMessageId: 'provider-message-id',
        providerStatus: 'unverified',
        contentLength: text.length,
      }),
    ]))
    expect(savedLogs[0]).not.toHaveProperty('message')
    expect(savedLogs[0]).not.toHaveProperty('text')
  })

  it('uses the current Evolution text payload with link preview disabled', async () => {
    const text = 'Formulario: https://usecognia.com.br/i/token'
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      key: { id: 'provider-message-id', fromMe: true },
      message: { extendedTextMessage: { text } },
      status: 'PENDING',
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }))

    await service.sendDirectWhatsApp('11999999999', text, ownerId)

    const body = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))
    expect(body).toEqual(expect.objectContaining({
      number: '5511999999999',
      text,
      delay: 1000,
      linkPreview: false,
    }))
    expect(body).not.toHaveProperty('textMessage')
  })

  it('retries with the legacy Evolution text payload when the current shape is rejected', async () => {
    const text = 'Formulario simples'
    const fetchSpy = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'invalid body' }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        key: { id: 'provider-message-id', fromMe: true },
        message: { extendedTextMessage: { text } },
        status: 'PENDING',
      }), { status: 201, headers: { 'Content-Type': 'application/json' } }))

    const result = await service.sendDirectWhatsApp('11999999999', text, ownerId)

    expect(result.sent).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    const retryBody = JSON.parse(String(fetchSpy.mock.calls[1][1]?.body))
    expect(retryBody).toEqual(expect.objectContaining({
      number: '5511999999999',
      textMessage: { text },
      delay: 1000,
      linkPreview: false,
    }))
  })

  it('retries with a minimal legacy payload when Evolution rejects optional fields too', async () => {
    const text = 'Formulario simples'
    const fetchSpy = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'invalid body' }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'invalid body' }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        key: { id: 'provider-message-id', fromMe: true },
        message: { extendedTextMessage: { text } },
        status: 'PENDING',
      }), { status: 201, headers: { 'Content-Type': 'application/json' } }))

    const result = await service.sendDirectWhatsApp('11999999999', text, ownerId)

    expect(result.sent).toBe(true)
    expect(result.providerStatus).toBe('unverified_legacy_payload')
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    const retryBody = JSON.parse(String(fetchSpy.mock.calls[2][1]?.body))
    expect(retryBody).toEqual({
      number: '5511999999999',
      textMessage: { text },
    })
  })

  it('blocks whitespace-only messages before calling the provider', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch')

    const result = await service.sendDirectWhatsApp('11999999999', '   \n ', ownerId)

    expect(result).toEqual(expect.objectContaining({
      sent: false,
      reason: 'invalid_content',
      nonRetryable: true,
      contentLength: 0,
    }))
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(savedLogs).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 'failed', contentLength: 0 }),
    ]))
  })

  it('restarts a closed instance without repeating an ambiguous message', async () => {
    const text = 'Teste de reconexão'
    const originalWorkerId = process.env.JEST_WORKER_ID
    delete process.env.JEST_WORKER_ID

    try {
      const fetchSpy = jest.spyOn(global, 'fetch')
        .mockResolvedValueOnce(new Response(JSON.stringify({
          status: 500,
          error: 'Internal Server Error',
          response: { message: 'Connection Closed' },
        }), { status: 500, headers: { 'Content-Type': 'application/json' } }))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          instance: { state: 'open' },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

      const result = await service.sendDirectWhatsApp('11999999999', text, ownerId)

      expect(result).toEqual(expect.objectContaining({
        sent: false,
        nonRetryable: true,
        contentLength: text.length,
      }))
      expect(fetchSpy).toHaveBeenCalledTimes(2)
      expect(String(fetchSpy.mock.calls[1][0])).toContain('/instance/restart/')
      expect(savedLogs).toHaveLength(1)
      expect(savedLogs[0]).toEqual(expect.objectContaining({ status: 'failed' }))
    } finally {
      if (originalWorkerId !== undefined) process.env.JEST_WORKER_ID = originalWorkerId
    }
  }, 12000)

  it('does not retry an ambiguous provider timeout to avoid duplicate messages', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      status: 500,
      error: 'Internal Server Error',
      response: { message: 'Timed Out' },
    }), { status: 500, headers: { 'Content-Type': 'application/json' } }))

    const result = await service.sendDirectWhatsApp('11999999999', 'Mensagem única', ownerId)

    expect(result.sent).toBe(false)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('does not resend when persisted content differs from the requested message', async () => {
    const text = 'Mensagem correta'
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      key: { id: 'message-id', fromMe: true },
      message: { extendedTextMessage: { text } },
      status: 'PENDING',
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
    jest.spyOn(service as any, 'verifyWhatsAppDelivery').mockResolvedValue('mismatch')

    const result = await service.sendDirectWhatsApp('11999999999', text, ownerId)

    expect(result).toEqual(expect.objectContaining({
      sent: false,
      nonRetryable: true,
      providerMessageId: 'message-id',
    }))
    expect(result.error).toContain('duplicidade')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('retries a due Evolution outbox item and marks it accepted', async () => {
    const text = 'Lembrete confirmado'
    const entity = {
      id: 'outbox-id',
      userId: ownerId,
      provider: 'evolution',
      status: 'failed',
      attempts: 1,
      recipientPhone: '11999999999',
      content: text,
      nextAttemptAt: new Date('2026-08-10T10:00:00Z'),
    }
    whatsAppOutbox.find.mockResolvedValueOnce([entity])
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      key: { id: 'retried-message-id', fromMe: true },
      message: { extendedTextMessage: { text } },
      status: 'PENDING',
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }))

    const processed = await service.retryDueWhatsAppOutbox(new Date('2026-08-10T11:00:00Z'))

    expect(processed).toBe(1)
    expect(entity.attempts).toBe(2)
    expect(entity.status).toBe('accepted')
    expect(entity.nextAttemptAt).toBeNull()
  })

  it('does not retry an expired automated reminder after the appointment time', async () => {
    const entity: any = {
      id: 'outbox-expired',
      userId: ownerId,
      provider: 'evolution',
      status: 'failed',
      attempts: 1,
      idempotencyKey: 'appointment-reminder:appt-expired:1h:2026-08-10:10:00:v2',
      recipientPhone: '11999999999',
      content: 'Lembrete antigo',
      nextAttemptAt: new Date('2026-08-10T12:30:00Z'),
    }
    whatsAppOutbox.find.mockResolvedValueOnce([entity])
    const fetchSpy = jest.spyOn(global, 'fetch')

    const processed = await service.retryDueWhatsAppOutbox(new Date('2026-08-10T13:00:00Z'))

    expect(processed).toBe(1)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(entity.status).toBe('failed')
    expect(entity.providerStatus).toBe('expired')
    expect(entity.nextAttemptAt).toBeNull()
  })

  it('does not bypass the outbox backoff while a retry is scheduled', async () => {
    const futureRetry = new Date(Date.now() + 5 * 60_000)
    outboxBuilder.execute.mockResolvedValueOnce({ raw: [] })
    whatsAppOutbox.manager.query.mockResolvedValueOnce([[], 0])
    whatsAppOutbox.findOneOrFail.mockResolvedValueOnce({
      status: 'failed',
      attempts: 1,
      nextAttemptAt: futureRetry,
      updatedAt: new Date(),
    })

    const claim = await (service as any).claimOutbox(ownerId, '11999999999', 'Lembrete', {
      type: 'Lembrete 24h',
      idempotencyKey: 'appointment-reminder:appt-1:24h:v1',
    })

    expect(claim).toEqual({ duplicate: true, completed: false, pendingReconciliation: false })
    expect(whatsAppOutbox.save).not.toHaveBeenCalled()
  })

  it('calls Evolution only once when two reminders claim the same idempotency key concurrently', async () => {
    const appointment = {
      id: 'appt-race', psychologistId: ownerId, date: '2026-08-12', time: '14:00',
      patient: { id: 'patient-1', name: 'Marina Silva', phone: '11999999999' },
      psychologist: { preferences: {} },
    }
    let inserts = 0
    outboxBuilder.execute.mockImplementation(async () => {
      inserts += 1
      return inserts === 1 ? { raw: [{ id: 'outbox-race' }] } : { raw: [] }
    })
    whatsAppOutbox.manager.query.mockResolvedValue([[], 0])
    whatsAppOutbox.findOneOrFail.mockResolvedValue({
      id: 'outbox-race', status: 'sending', attempts: 1, updatedAt: new Date(),
    })
    jest.spyOn(service, 'sendAppointmentPushReminder').mockResolvedValue({ sent: 0, removed: 0 })
    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async () => new Response(JSON.stringify({
      key: { id: 'provider-id' }, message: { conversation: 'Lembrete' }, status: 'PENDING',
    }), { status: 201 }))

    await Promise.all([
      service.sendAppointmentReminder(appointment, '24h'),
      service.sendAppointmentReminder(appointment, '24h'),
    ])

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('keeps an unverified automated reminder pending reconciliation', async () => {
    const entity: any = { id: 'outbox-unverified', status: 'sending', attempts: 1, updatedAt: new Date() }
    whatsAppOutbox.findOneOrFail.mockResolvedValueOnce(entity)
    jest.spyOn(service, 'sendAppointmentPushReminder').mockResolvedValue({ sent: 0, removed: 0 })
    jest.spyOn(service as any, 'verifyWhatsAppDelivery').mockResolvedValue('unknown')
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, init: any) => {
      const body = JSON.parse(init.body)
      const sentText = body.textMessage?.text ?? body.text ?? ''
      return new Response(JSON.stringify({
        key: { id: 'provider-unverified' },
        message: { conversation: sentText },
        status: 'PENDING',
      }), { status: 201 })
    })

    const result = await service.sendAppointmentReminder({
      id: 'appt-unverified', psychologistId: ownerId, date: '2026-08-12', time: '14:00',
      patient: { id: 'patient-1', name: 'Marina', phone: '11999999999' },
      psychologist: { preferences: {} },
    }, '24h')

    expect(result).toEqual(expect.objectContaining({
      sent: false,
      pendingReconciliation: true,
    }))
    expect(entity.status).toBe('delivery_unknown')
    expect(entity.providerMessageId).toBe('provider-unverified')
    expect(entity.nextAttemptAt).toBeNull()
  })

  it('reconciles an unknown delivery when Evolution later confirms its content', async () => {
    const entity: any = {
      id: 'outbox-unknown', userId: ownerId, provider: 'evolution', status: 'delivery_unknown',
      providerMessageId: 'provider-unknown', recipientPhone: '11999999999', content: 'Lembrete',
      updatedAt: new Date('2026-08-10T10:00:00Z'),
    }
    whatsAppOutbox.find.mockResolvedValueOnce([entity])
    jest.spyOn(service as any, 'verifyWhatsAppDelivery').mockResolvedValue('ok')

    const processed = await service.reconcileWhatsAppOutbox(new Date('2026-08-10T10:05:00Z'))

    expect(processed).toBe(1)
    expect(entity.status).toBe('accepted')
    expect(entity.providerStatus).toBe('reconciled')
  })

  it('moves stale sending records to an explicit unknown state instead of leaving them stuck', async () => {
    const entity: any = {
      id: 'outbox-stale', userId: ownerId, provider: 'evolution', status: 'sending',
      providerMessageId: null, recipientPhone: '11999999999', content: 'Lembrete',
      updatedAt: new Date('2026-08-10T09:00:00Z'),
    }
    whatsAppOutbox.find.mockResolvedValueOnce([entity])

    const processed = await service.reconcileWhatsAppOutbox(new Date('2026-08-10T10:05:00Z'))

    expect(processed).toBe(1)
    expect(entity.status).toBe('delivery_unknown')
    expect(entity.providerStatus).toBe('outcome_unknown')
  })

  it('keeps an automated reminder with an ambiguous reconnect outcome for reconciliation', async () => {
    const entity: any = { id: 'outbox-reconnect', status: 'sending', attempts: 1, updatedAt: new Date() }
    whatsAppOutbox.findOneOrFail.mockResolvedValueOnce(entity)
    jest.spyOn(service, 'sendAppointmentPushReminder').mockResolvedValue({ sent: 0, removed: 0 })
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: 500,
        response: { message: 'Connection Closed' },
      }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ instance: { state: 'open' } }), { status: 200 }))

    const result = await service.sendAppointmentReminder({
      id: 'appt-reconnect', psychologistId: ownerId, date: '2026-08-12', time: '14:00',
      patient: { id: 'patient-1', name: 'Marina', phone: '11999999999' },
      psychologist: { preferences: {} },
    }, '24h')

    expect(result.pendingReconciliation).toBe(true)
    expect(entity.status).toBe('delivery_unknown')
    expect(entity.providerStatus).toBe('connection_recovered_no_retry')
  })

  it('includes the scheduled date and time in the reminder idempotency key', async () => {
    jest.spyOn(service, 'sendAppointmentPushReminder').mockResolvedValue({ sent: 0, removed: 0 })
    const sendSpy = jest.spyOn(service as any, 'sendWhatsApp').mockResolvedValue({ sent: true })

    await service.sendAppointmentReminder({
      id: 'appt-versioned', psychologistId: ownerId, date: '2026-08-12', time: '14:30:00',
      patient: { id: 'patient-1', name: 'Marina', phone: '11999999999' },
      psychologist: { preferences: {} },
    }, '24h')

    expect((sendSpy.mock.calls[0][3] as any).idempotencyKey)
      .toBe('appointment-reminder:appt-versioned:24h:2026-08-12:14:30:v2')
  })

  it('does not immediately resend when the provider persists a blank message', async () => {
    const text = 'Sua sessao foi confirmada'
    const originalWorkerId = process.env.JEST_WORKER_ID
    delete process.env.JEST_WORKER_ID

    try {
      const fetchSpy = jest.spyOn(global, 'fetch')
        .mockResolvedValueOnce(new Response(JSON.stringify({
          key: { id: 'first-message-id', fromMe: true },
          message: { extendedTextMessage: { text } },
          status: 'PENDING',
        }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          messages: { records: [{ key: { id: 'first-message-id' }, message: { extendedTextMessage: { text: '' } } }] },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

      const result = await service.sendDirectWhatsApp('11999999999', text, ownerId)

      expect(result).toEqual(expect.objectContaining({
        sent: false,
        providerMessageId: 'first-message-id',
      }))
      expect(result.error).toContain('intervalo')
      expect(fetchSpy).toHaveBeenCalledTimes(2)
      expect(String(fetchSpy.mock.calls[1][0])).toContain('/chat/findMessages/')
      expect(savedLogs).toHaveLength(1)
      expect(savedLogs[0]).toEqual(expect.objectContaining({ status: 'failed', providerMessageId: 'first-message-id' }))
    } finally {
      if (originalWorkerId !== undefined) process.env.JEST_WORKER_ID = originalWorkerId
    }
  }, 10000)

  it('marks a blank persisted confirmation as retryable for the outbox', async () => {
    const text = 'Sua sessao foi confirmada para 22/07 as 14:00'
    const originalWorkerId = process.env.JEST_WORKER_ID
    delete process.env.JEST_WORKER_ID

    try {
      const blankPersisted = (id: string) => new Response(JSON.stringify({
        messages: { records: [{ key: { id }, message: { extendedTextMessage: { text: '' } } }] },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      const accepted = (id: string) => new Response(JSON.stringify({
        key: { id, fromMe: true },
        message: { extendedTextMessage: { text } },
        status: 'PENDING',
      }), { status: 201, headers: { 'Content-Type': 'application/json' } })

      const fetchSpy = jest.spyOn(global, 'fetch')
        .mockResolvedValueOnce(accepted('first-confirmation-id'))
        .mockResolvedValueOnce(blankPersisted('first-confirmation-id'))

      const result = await service.sendDirectWhatsApp('11999999999', text, ownerId, {
        type: 'Confirmacao de agenda',
      })

      expect(result).toEqual(expect.objectContaining({
        sent: false,
        reason: 'api_error',
        providerMessageId: 'first-confirmation-id',
      }))
      expect(result.error).toMatch(/sem conte/)
      expect(result.nonRetryable).not.toBe(true)
      expect(fetchSpy).toHaveBeenCalledTimes(2)
      expect(savedLogs).toEqual([expect.objectContaining({ status: 'failed' })])
    } finally {
      if (originalWorkerId !== undefined) process.env.JEST_WORKER_ID = originalWorkerId
    }
  }, 12000)

  it('propagates a WhatsApp failure from the booking confirmation flow', async () => {
    const failure = {
      sent: false,
      reason: 'api_error' as const,
      error: 'WhatsApp persistiu a mensagem sem conteudo',
      nonRetryable: true,
    }
    jest.spyOn(service as any, 'sendWhatsApp').mockResolvedValue(failure)

    const result = await service.sendBookingConfirmation({
      id: 'booking-id',
      patientName: 'Paciente Teste',
      patientPhone: '11999999999',
      patientEmail: '',
      psychologistId: ownerId,
      date: '22/07/2026',
      time: '14:00',
      cancellationToken: 'cancel-token',
    })

    expect(result).toEqual(failure)
  })

  it('uses the public booking page confirmation message when present', async () => {
    const sendSpy = jest.spyOn(service as any, 'sendWhatsApp').mockResolvedValue({ sent: true })

    await service.sendBookingConfirmation({
      id: 'booking-id',
      patientName: 'Marina Silva',
      patientPhone: '11999999999',
      patientEmail: '',
      psychologistId: ownerId,
      date: '2026-07-22',
      time: '14:00',
      publicCancellationCode: 'cancel-token',
    }, {
      confirmationMessage: 'Oi {{primeiro_nome}}, confirmado dia {{data}} as {{hora}} com {{profissional}}.',
      psychologist: { name: 'Dra. Allany', preferences: { confirmationTemplate: 'Mensagem geral' } },
    })

    expect(sendSpy).toHaveBeenCalledWith(
      '11999999999',
      expect.stringContaining('Oi Marina, confirmado dia 2026-07-22 as 14:00 com Dra. Allany.'),
      ownerId,
      expect.objectContaining({ type: 'Confirmacao de agenda' }),
    )
  })

  it('falls back to the general confirmation template when the public page message is empty', async () => {
    const sendSpy = jest.spyOn(service as any, 'sendWhatsApp').mockResolvedValue({ sent: true })

    await service.sendBookingConfirmation({
      id: 'booking-id',
      patientName: 'Marina Silva',
      patientPhone: '11999999999',
      patientEmail: '',
      psychologistId: ownerId,
      date: '2026-07-22',
      time: '14:00',
      publicCancellationCode: 'cancel-token',
    }, {
      confirmationMessage: '',
      psychologist: {
        name: 'Dra. Allany',
        preferences: {
          confirmationTemplate: 'Ola, {{nome}}. Sua sessao esta confirmada para {{data}} as {{hora}}.',
        },
      },
    })

    expect(sendSpy).toHaveBeenCalledWith(
      '11999999999',
      expect.stringContaining('Ola, Marina Silva. Sua sessao esta confirmada para 2026-07-22 as 14:00.'),
      ownerId,
      expect.objectContaining({ type: 'Confirmacao de agenda' }),
    )
  })

  it('ignores a booking template that renders only the time', async () => {
    const sendSpy = jest.spyOn(service as any, 'sendWhatsApp').mockResolvedValue({ sent: true })

    await service.sendBookingConfirmation({
      id: 'booking-id',
      patientName: 'Marina Silva',
      patientPhone: '11999999999',
      patientEmail: '',
      psychologistId: ownerId,
      date: '2026-07-22',
      time: '19:25',
      publicCancellationCode: 'cancel-token',
    }, {
      confirmationMessage: '{{hora}}',
      psychologist: { preferences: {} },
    })

    expect(sendSpy).toHaveBeenCalledWith(
      '11999999999',
      expect.stringContaining('Sua sessao foi confirmada'),
      ownerId,
      expect.objectContaining({ type: 'Confirmacao de agenda' }),
    )
  })

  it('uses the customized reminder template for appointment reminders', async () => {
    jest.spyOn(service, 'sendAppointmentPushReminder').mockResolvedValue({ sent: 0, removed: 0 })
    const sendSpy = jest.spyOn(service as any, 'sendWhatsApp').mockResolvedValue({ sent: true })

    await service.sendAppointmentReminder({
      id: 'appointment-id',
      patient: { id: 'patient-id', name: 'Marina Silva', phone: '11999999999' },
      psychologistId: ownerId,
      psychologist: {
        preferences: {
          reminderTemplate: 'Oi {{nome}}, lembrete {{antecedencia}}: {{data}} as {{hora}}.',
        },
      },
      date: '2026-07-22',
      time: '14:00',
    }, '24h')

    expect(sendSpy).toHaveBeenCalledWith(
      '11999999999',
      expect.stringContaining('Oi Marina, lembrete 24h:'),
      ownerId,
      expect.objectContaining({ type: 'Lembrete 24h' }),
    )
  })

  it('does not send booking confirmation when the preference is disabled', async () => {
    const sendSpy = jest.spyOn(service as any, 'sendWhatsApp').mockResolvedValue({ sent: true })

    const result = await service.sendBookingConfirmation({
      id: 'booking-id',
      patientName: 'Marina Silva',
      patientPhone: '11999999999',
      patientEmail: '',
      psychologistId: ownerId,
      date: '2026-07-22',
      time: '14:00',
      publicCancellationCode: 'cancel-token',
    }, {
      psychologist: { preferences: { bookingConfirmation: false } },
    })

    expect(result).toBeUndefined()
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('sends privacy-safe push alerts for public booking events', async () => {
    const pushSpy = jest.spyOn(service as any, 'sendPushToUser').mockResolvedValue({ sent: 1, removed: 0 })
    const booking = {
      id: 'booking-push-id',
      patientName: 'Marina Silva',
      patientNotes: 'Informacao clinica que nao pode aparecer',
      psychologistId: ownerId,
      date: '2026-08-10',
      time: '14:00',
      publicConfirmationToken: 'confirm-token',
      publicCancellationCode: 'cancel-token',
      psychologist: { preferences: {} },
    }
    const page = {
      psychologistId: ownerId,
      psychologist: { preferences: {} },
    }

    await service.sendBookingRequest(booking, page)
    await service.sendBookingCreatedToPsychologist(booking, page)
    await service.sendBookingCancellation(booking)

    expect(pushSpy).toHaveBeenCalledTimes(3)
    for (const [, rawPayload] of pushSpy.mock.calls) {
      const payload = rawPayload as Record<string, string>
      expect(payload.body).toContain('2026-08-10')
      expect(payload.body).not.toContain('Marina')
      expect(payload.body).not.toContain('Informacao clinica')
      expect(payload.url).toBe('https://usecognia.com.br/agendamentos')
    }
  })

  it('tags cancellation/confirmation links with utm_source=whatsapp only in the WhatsApp message body', async () => {
    const sendSpy = jest.spyOn(service as any, 'sendWhatsApp').mockResolvedValue({ sent: true })

    await service.sendBookingRequest({
      id: 'booking-id',
      patientName: 'Marina Silva',
      patientPhone: '11999999999',
      psychologistId: ownerId,
      date: '2026-08-10',
      time: '14:00',
      publicConfirmationToken: 'confirm-token',
      publicCancellationCode: 'cancel-token',
      psychologist: { phone: '11988888888', preferences: {} },
    }, {
      psychologistId: ownerId,
      psychologist: { phone: '11988888888', preferences: {} },
    })

    const patientMsg = sendSpy.mock.calls.find(call => call[0] === '11999999999')?.[1]
    const psychMsg = sendSpy.mock.calls.find(call => call[0] === '11988888888')?.[1]
    expect(patientMsg).toContain('/c/cancel-token?utm_source=whatsapp&utm_medium=message')
    expect(psychMsg).toContain('/agendar/confirmar/confirm-token?utm_source=whatsapp&utm_medium=message')

    sendSpy.mockClear()
    await service.sendBookingConfirmation({
      id: 'booking-id',
      patientName: 'Marina Silva',
      patientPhone: '11999999999',
      patientEmail: '',
      psychologistId: ownerId,
      date: '2026-08-10',
      time: '14:00',
      publicCancellationCode: 'cancel-token',
    })
    const confirmationMsg = sendSpy.mock.calls[0]?.[1]
    expect(confirmationMsg).toContain('/c/cancel-token?utm_source=whatsapp&utm_medium=message')
  })

  it('records an inconclusive accepted delivery without resending it', async () => {
    const text = 'Lembrete de sessao'
    const originalWorkerId = process.env.JEST_WORKER_ID
    delete process.env.JEST_WORKER_ID

    try {
      const fetchSpy = jest.spyOn(global, 'fetch')
        .mockResolvedValueOnce(new Response(JSON.stringify({
          key: { id: 'first-id', fromMe: true },
          message: { extendedTextMessage: { text } },
          status: 'PENDING',
        }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
        .mockResolvedValueOnce(new Response('erro interno', { status: 500 }))
        .mockResolvedValueOnce(new Response('erro interno', { status: 500 }))
        .mockResolvedValueOnce(new Response('erro interno', { status: 500 }))

      const result = await service.sendDirectWhatsApp('11999999999', text, ownerId)

      expect(result).toEqual(expect.objectContaining({
        sent: true,
        providerMessageId: 'first-id',
        providerStatus: 'unverified',
      }))
      expect(fetchSpy).toHaveBeenCalledTimes(4)
      expect(savedLogs).toEqual([expect.objectContaining({ status: 'sent', providerStatus: 'unverified' })])
    } finally {
      if (originalWorkerId !== undefined) process.env.JEST_WORKER_ID = originalWorkerId
    }
  }, 15000)

  it('retries the delivery check once when the message is not found yet, then confirms it was delivered', async () => {
    const text = 'Lembrete de sessao'
    const originalWorkerId = process.env.JEST_WORKER_ID
    delete process.env.JEST_WORKER_ID

    try {
      const fetchSpy = jest.spyOn(global, 'fetch')
        .mockResolvedValueOnce(new Response(JSON.stringify({
          key: { id: 'msg-id', fromMe: true },
          message: { extendedTextMessage: { text } },
          status: 'PENDING',
        }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ messages: { records: [] } }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        }))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          messages: { records: [{ key: { id: 'msg-id' }, message: { extendedTextMessage: { text } } }] },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

      const result = await service.sendDirectWhatsApp('11999999999', text, ownerId)

      expect(result).toEqual(expect.objectContaining({ sent: true, providerMessageId: 'msg-id' }))
      expect(result.providerStatus).not.toBe('unverified')
      expect(fetchSpy).toHaveBeenCalledTimes(3)
    } finally {
      if (originalWorkerId !== undefined) process.env.JEST_WORKER_ID = originalWorkerId
    }
  }, 12000)
})

describe('NotificationsService.sendAppointmentReminder — template por lead (24h/1h)', () => {
  const ownerId = 'psychologist-id'

  const cfg = {
    get: jest.fn((key: string) => ({
      FRONTEND_URL: 'https://usecognia.com.br',
      WHATSAPP_API_URL: 'https://evolution.test',
      WHATSAPP_API_KEY: 'test-api-key',
      WHATSAPP_INSTANCE_PREFIX: 'cognia',
    })[key]),
  } as unknown as ConfigService

  const users = {
    findOneBy: jest.fn().mockResolvedValue({ email: 'gilsonfilho96@outlook.com' }),
    // professionOf() consulta aqui para montar o vocabulario das mensagens.
    findOne: jest.fn().mockResolvedValue({ id: 'psychologist-id', profession: 'psicologia' }),
  }
  const planAccess = { hasAccess: jest.fn().mockResolvedValue(true) }
  const pushSubscriptions = { countBy: jest.fn(), findBy: jest.fn() }
  const nativePushTokens = { countBy: jest.fn(), findBy: jest.fn() }
  const whatsAppLogs = { create: jest.fn((v: Record<string, unknown>) => v), save: jest.fn(async (v: any) => v) }

  let service: NotificationsService
  let sentText: string

  function baseAppointment(preferences: Record<string, any> = {}) {
    return {
      psychologistId: ownerId,
      psychologist: { preferences },
      patient: { id: 'patient-1', name: 'Marina Souza', phone: '11999999999' },
      date: '2026-08-10',
      time: '14:00',
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    users.findOneBy.mockResolvedValue({ email: 'gilsonfilho96@outlook.com' })
    service = new NotificationsService(cfg, {} as any, planAccess as any, users as any, pushSubscriptions as any, nativePushTokens as any, whatsAppLogs as any, makeOutboxRepo() as any, disabledCloudProvider as any)
    sentText = ''
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, init: any) => {
      const body = JSON.parse(init.body)
      sentText = body.textMessage?.text ?? body.text ?? ''
      return new Response(JSON.stringify({
        key: { id: 'msg-id', fromMe: true },
        message: { extendedTextMessage: { text: sentText } },
        status: 'PENDING',
      }), { status: 201, headers: { 'Content-Type': 'application/json' } })
    })
  })

  it('usa reminderTemplate24h no lembrete de 24h quando configurado', async () => {
    await service.sendAppointmentReminder(baseAppointment({
      reminderTemplate24h: 'Template24h para {{nome}}',
      reminderTemplate2h: 'Template2h para {{nome}}',
    }), '24h')
    expect(sentText).toBe('Template24h para Marina')
  })

  it('usa o template curto legado no lembrete de 1h quando configurado', async () => {
    await service.sendAppointmentReminder(baseAppointment({
      reminderTemplate24h: 'Template24h para {{nome}}',
      reminderTemplate2h: 'Template2h para {{nome}}',
    }), '1h')
    expect(sentText).toBe('Template2h para Marina')
  })

  it('cai para o template único legado quando o específico do lead não está configurado', async () => {
    await service.sendAppointmentReminder(baseAppointment({
      reminderTemplate: 'Legado para {{nome}}',
    }), '1h')
    expect(sentText).toBe('Legado para Marina')
  })

  it('usa o texto padrão embutido quando nenhum template foi customizado', async () => {
    await service.sendAppointmentReminder(baseAppointment({}), '24h')
    expect(sentText).toContain('Lembrando que temos nosso encontro em')
  })

  it('usa texto direto de hoje no lembrete padrão de 1h', async () => {
    await service.sendAppointmentReminder({
      ...baseAppointment({}),
      date: '2026-08-11',
      time: '00:30',
    }, '1h')

    expect(sentText).toContain('Passando para lembrar do nosso encontro hoje')
    expect(sentText).toContain('00:30')
  })

  it('troca o padrão antigo salvo pelo novo texto de 1h', async () => {
    await service.sendAppointmentReminder(baseAppointment({
      reminderTemplate2h: 'Ola, {{nome}}! Passando para lembrar que nossa sessao acontece em {{data}} as {{hora}}. Ate daqui a pouco!',
    }), '1h')

    expect(sentText).toContain('Passando para lembrar do nosso encontro hoje')
    expect(sentText).not.toContain('nossa sessao acontece')
  })

  it('preserva modelo personalizado de 1h com a palavra hoje', async () => {
    await service.sendAppointmentReminder({
      ...baseAppointment({
        reminderTemplate2h: 'Ola, {{nome}}! Nossa sessao e hoje as {{hora}}.',
      }),
      date: '2026-08-11',
      time: '00:30',
    }, '1h')

    expect(sentText).toBe('Ola, Marina! Nossa sessao e hoje as 00:30.')
  })

  it('ignora template que renderiza somente o horario e usa a mensagem completa', async () => {
    await service.sendAppointmentReminder(baseAppointment({
      reminderTemplate24h: '{{hora}}',
    }), '24h')

    expect(sentText).not.toBe('14:00')
    expect(sentText).toContain('Marina')
    expect(sentText).toContain('14:00')
  })
})
