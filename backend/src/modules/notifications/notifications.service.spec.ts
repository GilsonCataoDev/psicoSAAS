import { ConfigService } from '@nestjs/config'
import { NotificationsService } from './notifications.service'

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
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      key: { id: 'provider-message-id', fromMe: true },
      message: { extendedTextMessage: { text } },
      status: 'PENDING',
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }))

    const result = await service.sendDirectWhatsApp('11999999999', text, ownerId)

    expect(result).toEqual(expect.objectContaining({
      sent: true,
      providerMessageId: 'provider-message-id',
      providerStatus: 'PENDING',
      contentLength: text.length,
    }))
    expect(savedLogs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        status: 'sent',
        providerMessageId: 'provider-message-id',
        providerStatus: 'PENDING',
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

    const result = await service.sendDirectWhatsApp('11999999999', text, ownerId)

    expect(result).toEqual(expect.objectContaining({
      sent: true,
      providerMessageId: 'recovered-message-id',
      contentLength: text.length,
    }))
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    expect(String(fetchSpy.mock.calls[1][0])).toContain('/instance/restart/')
    expect(savedLogs).toHaveLength(1)
    expect(savedLogs[0]).toEqual(expect.objectContaining({ status: 'sent' }))
  })

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
})
