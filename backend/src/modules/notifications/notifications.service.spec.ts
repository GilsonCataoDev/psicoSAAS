import { ConfigService } from '@nestjs/config'
import { NotificationsService } from './notifications.service'

process.env.ENCRYPTION_KEY = 'notifications-test-key-with-32-chars!'

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
  }
  const subs = { findOne: jest.fn().mockResolvedValue(null) }
  const pushSubscriptions = { countBy: jest.fn() }
  const whatsAppLogs = {
    create: jest.fn((value: Record<string, unknown>) => value),
    save: jest.fn(async (value: Record<string, unknown>) => {
      savedLogs.push(value)
      return value
    }),
  }

  let service: NotificationsService

  beforeEach(() => {
    savedLogs.length = 0
    jest.clearAllMocks()
    users.findOneBy.mockResolvedValue({ email: 'gilsonfilho96@outlook.com' })
    service = new NotificationsService(
      cfg,
      {} as any,
      subs as any,
      users as any,
      pushSubscriptions as any,
      whatsAppLogs as any,
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

  it('restarts a closed instance and retries the message once', async () => {
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
        .mockResolvedValueOnce(new Response(JSON.stringify({
          key: { id: 'recovered-message-id', fromMe: true },
          message: { extendedTextMessage: { text } },
          status: 'PENDING',
        }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          messages: { records: [{ key: { id: 'recovered-message-id' }, message: { extendedTextMessage: { text } } }] },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

      const result = await service.sendDirectWhatsApp('11999999999', text, ownerId)

      expect(result).toEqual(expect.objectContaining({
        sent: true,
        providerMessageId: 'recovered-message-id',
        contentLength: text.length,
      }))
      expect(result.providerStatus).not.toBe('unverified')
      expect(fetchSpy).toHaveBeenCalledTimes(4)
      expect(String(fetchSpy.mock.calls[1][0])).toContain('/instance/restart/')
      expect(savedLogs).toHaveLength(1)
      expect(savedLogs[0]).toEqual(expect.objectContaining({ status: 'sent' }))
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

  it('resends once when the provider confirms sendText but persists the message blank', async () => {
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
        .mockResolvedValueOnce(new Response(JSON.stringify({
          key: { id: 'second-message-id', fromMe: true },
          message: { extendedTextMessage: { text } },
          status: 'PENDING',
        }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          messages: { records: [{ key: { id: 'second-message-id' }, message: { extendedTextMessage: { text } } }] },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

      const result = await service.sendDirectWhatsApp('11999999999', text, ownerId)

      expect(result).toEqual(expect.objectContaining({
        sent: true,
        providerMessageId: 'second-message-id',
      }))
      expect(fetchSpy).toHaveBeenCalledTimes(4)
      expect(String(fetchSpy.mock.calls[1][0])).toContain('/chat/findMessages/')
      expect(String(fetchSpy.mock.calls[2][0])).toContain('/message/sendText/')
      expect(String(fetchSpy.mock.calls[3][0])).toContain('/chat/findMessages/')
      expect(savedLogs).toHaveLength(1)
      expect(savedLogs[0]).toEqual(expect.objectContaining({ status: 'sent', providerMessageId: 'second-message-id' }))
    } finally {
      if (originalWorkerId !== undefined) process.env.JEST_WORKER_ID = originalWorkerId
    }
  }, 10000)

  it('reports failure when both the original confirmation and its retry persist blank', async () => {
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
        .mockResolvedValueOnce(accepted('retry-confirmation-id'))
        .mockResolvedValueOnce(blankPersisted('retry-confirmation-id'))

      const result = await service.sendDirectWhatsApp('11999999999', text, ownerId, {
        type: 'Confirmacao de agenda',
      })

      expect(result).toEqual(expect.objectContaining({
        sent: false,
        reason: 'api_error',
        providerMessageId: 'retry-confirmation-id',
      }))
      expect(result.error).toContain('sem conteúdo')
      expect(fetchSpy).toHaveBeenCalledTimes(4)
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

    // Um resultado inconclusivo (falha na consulta de verificação, por exemplo)
    // é tratado com a mesma urgência de um vazio confirmado — reenvia antes de
    // aceitar, já que a psicóloga pode ver a mensagem certa na própria conversa
    // mesmo quando o paciente recebe em branco.
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

  it('resends once when the delivery check is inconclusive on the first attempt, and succeeds on the retry', async () => {
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
        .mockResolvedValueOnce(new Response('erro interno', { status: 500 })) // findMessages falha -> 'unknown'
        .mockResolvedValueOnce(new Response(JSON.stringify({
          key: { id: 'second-id', fromMe: true },
          message: { extendedTextMessage: { text } },
          status: 'PENDING',
        }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          messages: { records: [{ key: { id: 'second-id' }, message: { extendedTextMessage: { text } } }] },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

      const result = await service.sendDirectWhatsApp('11999999999', text, ownerId)

      expect(result).toEqual(expect.objectContaining({ sent: true, providerMessageId: 'second-id' }))
      expect(result.providerStatus).not.toBe('unverified')
      expect(fetchSpy).toHaveBeenCalledTimes(4)
    } finally {
      if (originalWorkerId !== undefined) process.env.JEST_WORKER_ID = originalWorkerId
    }
  }, 15000)

  it('marks the delivery as unverified (but still sent) when the check stays inconclusive even after the resend', async () => {
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
        .mockResolvedValueOnce(new Response(JSON.stringify({
          key: { id: 'second-id', fromMe: true },
          message: { extendedTextMessage: { text } },
          status: 'PENDING',
        }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
        .mockResolvedValueOnce(new Response('erro interno', { status: 500 }))

      const result = await service.sendDirectWhatsApp('11999999999', text, ownerId)

      expect(result).toEqual(expect.objectContaining({
        sent: true,
        providerMessageId: 'second-id',
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

describe('NotificationsService.sendAppointmentReminder — template por lead (24h/2h)', () => {
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
  }
  const subs = { findOne: jest.fn().mockResolvedValue(null) }
  const pushSubscriptions = { countBy: jest.fn(), findBy: jest.fn() }
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
    service = new NotificationsService(cfg, {} as any, subs as any, users as any, pushSubscriptions as any, whatsAppLogs as any)
    sentText = ''
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, init: any) => {
      sentText = JSON.parse(init.body).text
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

  it('usa reminderTemplate2h no lembrete de 2h quando configurado', async () => {
    await service.sendAppointmentReminder(baseAppointment({
      reminderTemplate24h: 'Template24h para {{nome}}',
      reminderTemplate2h: 'Template2h para {{nome}}',
    }), '2h')
    expect(sentText).toBe('Template2h para Marina')
  })

  it('cai para o template único legado quando o específico do lead não está configurado', async () => {
    await service.sendAppointmentReminder(baseAppointment({
      reminderTemplate: 'Legado para {{nome}}',
    }), '2h')
    expect(sentText).toBe('Legado para Marina')
  })

  it('usa o texto padrão embutido quando nenhum template foi customizado', async () => {
    await service.sendAppointmentReminder(baseAppointment({}), '24h')
    expect(sentText).toContain('Lembrando que temos nosso encontro em')
  })
})
