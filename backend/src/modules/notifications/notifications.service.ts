import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { EmailService } from '../email/email.service'
import { Subscription } from '../billing/entities/subscription.entity'
import { User } from '../auth/entities/user.entity'

export type WhatsAppDeliveryResult = {
  sent: boolean
  reason?: 'plan' | 'not_configured' | 'disconnected' | 'api_error'
  error?: string
}

/**
 * NotificationsService
 * Mensagens via WhatsApp (Evolution API) + e-mail (Resend).
 * WhatsApp é o canal primário; e-mail é fallback.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)
  private readonly BASE_URL: string
  private readonly WA_URL: string
  private readonly WA_KEY: string
  private readonly WA_INSTANCE: string
  private readonly waEnabled: boolean

  constructor(
    private cfg: ConfigService,
    private email: EmailService,
    @InjectRepository(Subscription) private subs: Repository<Subscription>,
    @InjectRepository(User) private users: Repository<User>,
  ) {
    this.BASE_URL     = cfg.get('FRONTEND_URL') ?? 'http://localhost:3000'
    this.WA_URL       = cfg.get('WHATSAPP_API_URL') ?? ''
    this.WA_KEY       = cfg.get('WHATSAPP_API_KEY') ?? ''
    this.WA_INSTANCE  = cfg.get('WHATSAPP_INSTANCE') ?? 'default'
    this.waEnabled    = !!(this.WA_URL && this.WA_KEY && cfg.get('NODE_ENV') === 'production')
  }

  private async canUseWhatsAppAutomation(userId?: string | null): Promise<boolean> {
    if (!userId) return false

    const sub = await this.subs.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    })
    const plan = (sub?.status === 'active' || sub?.status === 'trialing') ? sub.plan : 'free'
    return plan === 'pro'
  }

  // ─── Envio via WhatsApp (Evolution API) ──────────────────────────────────

  async getWhatsAppStatus(): Promise<{ configured: boolean; connected: boolean; state: string }> {
    if (!this.waEnabled) return { configured: false, connected: false, state: 'not_configured' }

    try {
      const res = await fetch(`${this.WA_URL}/instance/connectionState/${this.WA_INSTANCE}`, {
        headers: { apikey: this.WA_KEY },
      })
      const data = await res.json() as { instance?: { state?: string } }
      const state = data.instance?.state ?? 'unknown'
      return { configured: true, connected: state === 'open', state }
    } catch {
      return { configured: true, connected: false, state: 'unavailable' }
    }
  }

  async getWhatsAppQrCode(): Promise<{ base64: string }> {
    if (!this.waEnabled) throw new BadRequestException('WhatsApp nao configurado')
    const res = await fetch(`${this.WA_URL}/instance/connect/${this.WA_INSTANCE}`, {
      headers: { apikey: this.WA_KEY },
    })
    const data = await res.json() as { base64?: string; message?: string }
    if (!res.ok || !data.base64) {
      throw new BadRequestException(data.message ?? 'Nao foi possivel gerar o QR Code')
    }
    return { base64: data.base64 }
  }

  async resetWhatsAppConnection(): Promise<{ base64: string }> {
    if (!this.waEnabled) throw new BadRequestException('WhatsApp nao configurado')

    await fetch(`${this.WA_URL}/instance/logout/${this.WA_INSTANCE}`, {
      method: 'DELETE',
      headers: { apikey: this.WA_KEY },
    }).catch(() => undefined)

    await new Promise(resolve => setTimeout(resolve, 1500))
    return this.getWhatsAppQrCode()
  }

  async sendTestWhatsApp(ownerId: string, phone?: string): Promise<WhatsAppDeliveryResult> {
    const user = await this.users.findOneBy({ id: ownerId })
    const prefs = (user?.preferences ?? {}) as Record<string, any>
    const target = phone || prefs.whatsapp || user?.phone
    if (!target) throw new BadRequestException('Informe um numero de WhatsApp')

    const result = await this.sendWhatsApp(
      target,
      'Teste da UseCognia: seu WhatsApp esta conectado e pronto para as automacoes.',
      ownerId,
    )
    if (!result.sent) throw new BadRequestException(result.error ?? 'Mensagem nao enviada')
    return result
  }

  private async sendWhatsApp(phone: string, text: string, ownerId?: string | null): Promise<WhatsAppDeliveryResult> {
    if (!await this.canUseWhatsAppAutomation(ownerId)) {
      this.logger.log(`[WhatsApp bloqueado por plano] owner=${ownerId ?? 'unknown'} phone=${phone}`)
      return { sent: false, reason: 'plan', error: 'Automacao disponivel apenas no plano Pro' }
    }

    if (!this.waEnabled) {
      this.logger.log(`[WhatsApp DEV] ${phone}: ${text.slice(0, 60)}...`)
      return { sent: false, reason: 'not_configured', error: 'WhatsApp nao configurado' }
    }

    // Normaliza o número: remove tudo que não for dígito, garante DDI 55
    const normalized = phone.replace(/\D/g, '')
    const withDdi = normalized.startsWith('55') ? normalized : `55${normalized}`

    try {
      const res = await fetch(
        `${this.WA_URL}/message/sendText/${this.WA_INSTANCE}`,
        {
          method: 'POST',
          headers: {
            'apikey': this.WA_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: withDdi,
            text,
          }),
        },
      )
      if (!res.ok) {
        const err = await res.text()
        this.logger.error(`[WhatsApp] Erro ${res.status}: ${err}`)
        return { sent: false, reason: 'api_error', error: `WhatsApp respondeu ${res.status}: ${err.slice(0, 120)}` }
      }
      return { sent: true }
    } catch {
      return { sent: false, reason: 'disconnected', error: 'WhatsApp desconectado ou indisponivel' }
    }
  }

  // ─── Agendamentos internos ─────────────────────────────────────────────────

  async sendDirectWhatsApp(phone: string, text: string, ownerId?: string | null): Promise<WhatsAppDeliveryResult> {
    return this.sendWhatsApp(phone, text, ownerId)
  }

  async scheduleReminder(appointment: any): Promise<void> {
    if (!appointment.patient?.phone) return
    const { patient, date, time } = appointment
    const first = patient.name.split(' ')[0]

    // Formata a data para pt-BR (ex: "terça-feira, 29 de abril")
    const dateLabel = (() => {
      try {
        const [y, m, d] = String(date).split('-').map(Number)
        return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
          weekday: 'long', day: 'numeric', month: 'long',
        })
      } catch { return String(date) }
    })()

    const msg = `Olá, ${first}! 🌿\n\nLembrando que temos nosso encontro em *${dateLabel}* às *${time}*.\n\nAté lá! 💙`
    await this.sendWhatsApp(patient.phone, msg, appointment.psychologistId)
  }

  async sendAppointmentReminder(appointment: any, lead: '24h' | '2h'): Promise<WhatsAppDeliveryResult> {
    if (!appointment.patient?.phone) return { sent: false, error: 'Paciente sem WhatsApp' }
    const { patient, date, time } = appointment
    const prefs = (appointment.psychologist?.preferences ?? {}) as Record<string, any>
    const first = patient.name.split(' ')[0]
    const timeLabel = String(time).slice(0, 5)

    const dateLabel = (() => {
      try {
        const [y, m, d] = String(date).split('-').map(Number)
        return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
          weekday: 'long', day: 'numeric', month: 'long',
        })
      } catch { return String(date) }
    })()

    const defaultMsg = lead === '24h'
      ? `Ola, ${first}!\n\nLembrando que temos nosso encontro em *${dateLabel}* as *${timeLabel}*.\n\nAte la!`
      : `Ola, ${first}!\n\nPassando para lembrar que nossa sessao e hoje as *${timeLabel}*.\n\nAte daqui a pouco!`
    const msg = typeof prefs.reminderTemplate === 'string' && prefs.reminderTemplate.trim()
      ? this.renderReminderTemplate(prefs.reminderTemplate, patient.name, dateLabel, timeLabel, lead)
      : defaultMsg

    return this.sendWhatsApp(patient.phone, msg, appointment.psychologistId)
  }

  async sendPaymentRequest(
    patient: any,
    amount: number,
    pixKey?: string,
    template?: string,
    includeReceipt?: boolean,
  ): Promise<WhatsAppDeliveryResult> {
    if (!patient?.phone) return { sent: false, error: 'Paciente sem WhatsApp' }
    const firstName = patient.name.split(' ')[0]
    const receiptLine = includeReceipt ? 'Depois do pagamento, por favor me envie o comprovante por aqui.\n\n' : ''
    const defaultMessage =
      `Ola, ${firstName}!\n\n` +
      `Segue o valor da nossa sessao: *R$ ${amount.toFixed(2)}*.\n\n` +
      (pixKey ? `PIX: \`${pixKey}\`\n\n` : '') +
      receiptLine +
      `Obrigada!`
    const msg = template
      ? this.renderPaymentTemplate(template, patient.name, amount, pixKey, includeReceipt)
      : defaultMessage
    return this.sendWhatsApp(patient.phone, msg, patient.psychologistId)
  }

  async sendLatePaymentReminder(patient: any, amount: number, pixKey?: string): Promise<WhatsAppDeliveryResult> {
    if (!patient?.phone) return { sent: false, error: 'Paciente sem WhatsApp' }
    const firstName = patient.name.split(' ')[0]
    const msg =
      `Ola, ${firstName}!\n\n` +
      `Passando para lembrar do pagamento pendente da sessao (*R$ ${amount.toFixed(2)}*).\n\n` +
      (pixKey ? `Chave PIX: \`${pixKey}\`\n\n` : '') +
      `Qualquer duvida, e so me chamar.`
    return this.sendWhatsApp(patient.phone, msg, patient.psychologistId)
  }

  // ─── Booking público ───────────────────────────────────────────────────────

  async sendBookingRequest(booking: any, page: any): Promise<void> {
    const confirmUrl = `${this.BASE_URL}/agendar/confirmar/${booking.confirmationToken}`
    const cancelUrl  = `${this.BASE_URL}/agendar/cancelar/${booking.confirmationToken}`

    // Para o paciente — WhatsApp
    if (booking.patientPhone) {
      const patientMsg =
        `Olá, ${booking.patientName.split(' ')[0]}! 🌿\n\n` +
        `Recebemos sua solicitação para *${booking.date}* às *${booking.time}*.\n\n` +
        `Assim que confirmarmos, você receberá uma mensagem.\n` +
        `Precisando cancelar: ${cancelUrl}\n\nAté breve! 💙`
      await this.sendWhatsApp(booking.patientPhone, patientMsg, page.psychologistId)
    }

    // Para o psicólogo — WhatsApp + e-mail
    if (page.psychologist?.phone) {
      const psychMsg =
        `📅 *Nova solicitação de sessão*\n\n` +
        `Pessoa: ${booking.patientName}\n` +
        `Data: ${booking.date} às ${booking.time}\n` +
        (booking.patientNotes ? `Obs: ${booking.patientNotes}\n` : '') +
        `\nConfirmar: ${confirmUrl}`
      await this.sendWhatsApp(page.psychologist.phone, psychMsg, page.psychologistId)
    }

    // E-mail de backup para o psicólogo
    if (page.psychologist?.email) {
      await this.email.sendBookingRequest(
        booking.patientName,
        page.psychologist.email,
        booking.date,
        booking.time,
        confirmUrl,
      )
    }

    this.logger.log(`[Booking] Nova solicitação: ${booking.patientName} — ${booking.date} ${booking.time}`)
  }

  async sendBookingConfirmation(booking: any): Promise<void> {
    const cancelUrl = `${this.BASE_URL}/agendar/cancelar/${booking.confirmationToken}`
    const first = booking.patientName.split(' ')[0]

    // WhatsApp para o paciente
    if (booking.patientPhone) {
      const msg =
        `Ótima notícia, ${first}! 🎉\n\n` +
        `Sua sessão foi confirmada para *${booking.date}* às *${booking.time}*.\n\n` +
        `Precisando cancelar: ${cancelUrl}\n\nNos vemos lá! 💙`
      await this.sendWhatsApp(booking.patientPhone, msg, booking.psychologistId)
    }

    // E-mail para o paciente
    if (booking.patientEmail) {
      await this.email.sendBookingConfirmation(
        booking.patientName,
        booking.patientEmail,
        booking.date,
        booking.time,
        cancelUrl,
      )
    }

    this.logger.log(`[Booking] Confirmação enviada: ${booking.patientName}`)
  }

  async sendPaymentReminder(booking: any, pixKey?: string): Promise<void> {
    if (!booking.patientPhone) return
    const firstName = booking.patientName.split(' ')[0]
    const msg =
      `Olá, ${firstName}! 💙\n\n` +
      `Passando para lembrar sobre o pagamento da nossa sessão ` +
      `(*R$ ${Number(booking.amount).toFixed(2)}*).\n\n` +
      (pixKey ? `Chave PIX: \`${pixKey}\`\n\n` : '') +
      `Qualquer dúvida, é só falar. 🌿`
    await this.sendWhatsApp(booking.patientPhone, msg, booking.psychologistId)
  }

  private renderPaymentTemplate(
    template: string,
    patientName: string,
    amount: number,
    pixKey?: string,
    includeReceipt?: boolean,
  ): string {
    const receiptMessage = includeReceipt ? 'Pode me enviar o comprovante por aqui depois do pagamento.' : ''
    const rendered = template
      .replaceAll('{{nome}}', patientName.split(' ')[0] || patientName)
      .replaceAll('{{valor}}', `R$ ${amount.toFixed(2)}`)
      .replaceAll('{{pix}}', pixKey ?? 'PIX nao configurado')
      .replaceAll('{{comprovante}}', receiptMessage)

    if (includeReceipt && !template.includes('{{comprovante}}')) {
      return `${rendered}\n\n${receiptMessage}`
    }
    return rendered
  }

  private renderReminderTemplate(
    template: string,
    patientName: string,
    dateLabel: string,
    time: string,
    lead: '24h' | '2h',
  ): string {
    return template
      .replaceAll('{{nome}}', patientName.split(' ')[0] || patientName)
      .replaceAll('{{data}}', dateLabel)
      .replaceAll('{{hora}}', time)
      .replaceAll('{{antecedencia}}', lead)
  }
}
