import { CloudWhatsAppProvider } from './cloud-whatsapp.provider'

describe('CloudWhatsAppProvider', () => {
  const values: Record<string, string> = {
    WHATSAPP_PROVIDER: 'cloud_api',
    WHATSAPP_CLOUD_ROLLOUT_USER_IDS: 'user-1',
    WHATSAPP_CLOUD_ACCESS_TOKEN: 'token',
    WHATSAPP_CLOUD_PHONE_NUMBER_ID: 'phone-id',
    WHATSAPP_CLOUD_API_VERSION: 'v23.0',
  }
  const provider = new CloudWhatsAppProvider({ get: (key: string) => values[key] } as any)

  afterEach(() => jest.restoreAllMocks())

  it('so ativa contas na allowlist', () => {
    expect(provider.isEnabledFor('user-1')).toBe(true)
    expect(provider.isEnabledFor('user-2')).toBe(false)
  })

  it('envia template aprovado e retorna o id da Meta', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 }))
    const result = await provider.send({
      ownerId: 'user-1', phone: '11999999999', text: 'Lembrete renderizado',
      template: { name: 'lembrete_24h', language: 'pt_BR', bodyParameters: ['Ana', 'amanha', '14:00'] },
    })
    expect(result).toEqual(expect.objectContaining({ sent: true, providerMessageId: 'wamid.1' }))
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toEqual(expect.objectContaining({ type: 'template', to: '5511999999999' }))
  })
})
