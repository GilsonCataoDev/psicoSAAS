import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { WhatsAppProvider, WhatsAppProviderCommand, WhatsAppProviderResult } from './whatsapp-provider'

@Injectable()
export class CloudWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'cloud_api' as const

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.token && this.phoneNumberId)
  }

  isEnabledFor(ownerId: string): boolean {
    if (this.config.get<string>('WHATSAPP_PROVIDER') !== 'cloud_api') return false
    const rollout = (this.config.get<string>('WHATSAPP_CLOUD_ROLLOUT_USER_IDS') ?? '')
      .split(',').map(value => value.trim()).filter(Boolean)
    return rollout.includes('*') || rollout.includes(ownerId)
  }

  async send(command: WhatsAppProviderCommand): Promise<WhatsAppProviderResult> {
    const text = command.text?.trim()
    if (!text) return { sent: false, reason: 'invalid_content', error: 'Mensagem sem conteudo', nonRetryable: true, contentLength: 0 }
    if (!this.isConfigured() || !command.template?.name) {
      return { sent: false, reason: 'not_configured', error: 'Cloud API ou template aprovado nao configurado' }
    }

    const number = command.phone.replace(/\D/g, '')
    const to = number.startsWith('55') ? number : `55${number}`
    const version = this.config.get<string>('WHATSAPP_CLOUD_API_VERSION') ?? 'v23.0'
    try {
      const response = await fetch(`https://graph.facebook.com/${version}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: command.template.name,
            language: { code: command.template.language },
            components: command.template.bodyParameters.length ? [{
              type: 'body',
              parameters: command.template.bodyParameters.map(text => ({ type: 'text', text })),
            }] : undefined,
          },
        }),
      })
      const payload = await response.json().catch(() => ({})) as any
      if (!response.ok) {
        return {
          sent: false,
          reason: 'api_error',
          error: String(payload?.error?.message ?? `Cloud API respondeu ${response.status}`).slice(0, 240),
          nonRetryable: response.status >= 400 && response.status < 500 && response.status !== 429,
          contentLength: text.length,
        }
      }
      const messageId = payload?.messages?.[0]?.id
      if (!messageId) return { sent: false, reason: 'api_error', error: 'Cloud API nao retornou identificador', contentLength: text.length }
      return { sent: true, providerMessageId: messageId, providerStatus: 'accepted', contentLength: text.length }
    } catch {
      return { sent: false, reason: 'disconnected', error: 'Cloud API indisponivel', contentLength: text.length }
    }
  }

  private get token(): string { return this.config.get<string>('WHATSAPP_CLOUD_ACCESS_TOKEN') ?? '' }
  private get phoneNumberId(): string { return this.config.get<string>('WHATSAPP_CLOUD_PHONE_NUMBER_ID') ?? '' }
}
