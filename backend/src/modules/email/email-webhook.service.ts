import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Webhook } from 'svix'
import { EmailSuppression } from './entities/email-suppression.entity'

type ResendWebhookEvent = {
  type: string
  data: {
    to?: string[]
    email_id?: string
    bounce?: { type?: 'Permanent' | 'Transient' | 'Undetermined'; message?: string }
  }
}

@Injectable()
export class EmailWebhookService {
  private readonly logger = new Logger(EmailWebhookService.name)

  constructor(
    private readonly cfg: ConfigService,
    @InjectRepository(EmailSuppression)
    private readonly suppressions: Repository<EmailSuppression>,
  ) {}

  /**
   * O Resend assina webhooks no formato Svix (svix-id/svix-timestamp/svix-signature).
   * Verificação falha fechado: sem o segredo configurado, nenhum payload é aceito.
   */
  verify(rawBody: string, headers: Record<string, string | string[] | undefined>): ResendWebhookEvent | null {
    const secret = this.cfg.get<string>('RESEND_WEBHOOK_SECRET')
    if (!secret) {
      this.logger.warn('[Resend webhook] RESEND_WEBHOOK_SECRET ausente — payload rejeitado')
      return null
    }

    try {
      const webhook = new Webhook(secret)
      const svixHeaders = {
        'svix-id': String(headers['svix-id'] ?? ''),
        'svix-timestamp': String(headers['svix-timestamp'] ?? ''),
        'svix-signature': String(headers['svix-signature'] ?? ''),
      }
      return webhook.verify(rawBody, svixHeaders) as ResendWebhookEvent
    } catch (err: any) {
      this.logger.warn(`[Resend webhook] Assinatura invalida: ${err?.message}`)
      return null
    }
  }

  async process(event: ResendWebhookEvent): Promise<void> {
    const email = event.data?.to?.[0]?.toLowerCase().trim()
    if (!email) return

    if (event.type === 'email.complained') {
      await this.suppress(email, 'complained', event.type)
      return
    }

    if (event.type === 'email.bounced') {
      // So bounce permanente (endereco invalido/inexistente) suprime de forma
      // definitiva. Bounce transitorio (caixa cheia, servidor temporariamente
      // fora) e esperado se resolver sozinho e nao deve bloquear futuros envios.
      if (event.data?.bounce?.type === 'Permanent') {
        await this.suppress(email, 'bounced', event.type)
      }
      return
    }
  }

  private async suppress(email: string, reason: 'bounced' | 'complained', sourceEventType: string): Promise<void> {
    const exists = await this.suppressions.exist({ where: { email } })
    if (exists) return

    await this.suppressions.save(this.suppressions.create({ email, reason, sourceEventType }))
    this.logger.warn(`[Resend webhook] Endereco suprimido email=${email} motivo=${reason}`)
  }
}
