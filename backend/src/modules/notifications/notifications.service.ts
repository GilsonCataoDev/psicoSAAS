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

const COMPED_PRO_EMAILS = (process.env.COMPED_PRO_EMAILS ?? 'gilsonfilho96@outlook.com')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean)

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
  private readonly WA_INSTANCE_PREFIX: string
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
    this.WA_INSTANCE_PREFIX = cfg.get('WHATSAPP_INSTANCE_PREFIX') ?? 'usecognia'
    this.waEnabled    = !!(this.WA_URL && this.WA_KEY && cfg.get('NODE_ENV') === 'production')
  }

  private async canUseWhatsAppAutomation(userId?: string | null): Promise<boolean> {
    if (!userId) return false

    const [user, sub] = await Promise.all([
      this.users.findOneBy({ id: userId }),
      this.subs.findOne({
        where: { userId },
        order: { createdAt: 'DESC' },
      }),
    ])
    if (user?.email && COMPED_PRO_EMAILS.includes(user.email.toLowerCase())) return true

    const plan = (sub?.status === 'active' || sub?.status === 'trialing') ? sub.plan : 'free'
    return plan === 'pro'
  }

  // ─── Envio via WhatsApp (Evolution API) ──────────────────────────────────

  async getWhatsAppStatus(ownerId: string): Promise<{ configured: boolean; connected: boolean; state: string; instance: string }> {
    const instance = this.getWhatsAppInstance(ownerId)
    if (!this.waEnabled) return { configured: false, connected: false, state: 'not_configured', instance }

    try {
      const res = await fetch(`${this.WA_URL}/instance/connectionState/${instance}`, {
        headers: { apikey: this.WA_KEY },
      })
      if (res.status === 404) return { configured: true, connected: false, state: 'not_created', instance }
      const data = await res.json() as { instance?: { state?: string } }
      const state = data.instance?.state ?? 'unknown'
      return { configured: true, connected: state === 'open', state, instance }
    } catch {
      return { configured: true, connected: false, state: 'unavailable', instance }
    }
  }

  async getWhatsAppQrCode(ownerId: string): Promise<{ base64: string; instance: string }> {
    if (!this.waEnabled) throw new BadRequestException('WhatsApp nao configurado')
    const instance = this.getWhatsAppInstance(ownerId)
    await this.ensureWhatsAppInstance(instance)
    const res = await fetch(`${this.WA_URL}/instance/connect/${instance}`, {
      headers: { apikey: this.WA_KEY },
    })
    const data = await res.json() as { base64?: string; message?: string }
    if (!res.ok || !data.base64) {
      throw new BadRequestException(data.message ?? 'Nao foi possivel gerar o QR Code')
    }
    return { base64: data.base64, instance }
  }

  async resetWhatsAppConnection(ownerId: string): Promise<{ base64: string; instance: string }> {
    if (!this.waEnabled) throw new BadRequestException('WhatsApp nao configurado')
    const instance = this.getWhatsAppInstance(ownerId)

    await fetch(`${this.WA_URL}/instance/logout/${instance}`, {
      method: 'DELETE',
      headers: { apikey: this.WA_KEY },
    }).catch(() => undefined)

    await new Promise(resolve => setTimeout(resolve, 1500))
    return this.getWhatsAppQrCode(ownerId)
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
      const instance = this.getWhatsAppInstance(ownerId)
      const res = await fetch(
        `${this.WA_URL}/message/sendText/${instance}`,
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
        this.logger.error(`[WhatsApp] Erro ${res.status} instance=${instance}: ${err}`)
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

  private getWhatsAppInstance(ownerId?: string | null): string {
    if (!ownerId) return `${this.WA_INSTANCE_PREFIX}-unknown`
    const safeId = ownerId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24).toLowerCase()
    return `${this.WA_INSTANCE_PREFIX}-${safeId}`
  }

  private async ensureWhatsAppInstance(instance: string): Promise<void> {
    const status = await fetch(`${this.WA_URL}/instance/connectionState/${instance}`, {
      headers: { apikey: this.WA_KEY },
    }).catch(() => null)
    if (status && status.status !== 404) return

    const res = await fetch(`${this.WA_URL}/instance/create`, {
      method: 'POST',
      headers: {
        apikey: this.WA_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instanceName: instance,
        qrcode: false,
        integration: 'WHATSAPP-BAILEYS',
      }),
    })
    if (res.ok || res.status === 409 || res.status === 403) return

    const err = await res.text()
    throw new BadRequestException(`Nao foi possivel criar a conexao WhatsApp: ${err.slice(0, 120)}`)
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

    const msg = `Ola, ${first}!\n\nLembrando que temos nosso encontro em *${dateLabel}* as *${String(time).slice(0, 5)}*.\n\nAte la!`
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
      `Obrigado(a).`
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
    const cancelUrl  = this.getCancellationUrl(booking)

    // Para o paciente — WhatsApp
    if (booking.patientPhone) {
      const patientMsg =
        `Ola, ${booking.patientName.split(' ')[0]}!\n\n` +
        `Recebemos sua solicitacao para *${booking.date}* as *${String(booking.time).slice(0, 5)}*.\n\n` +
        `Assim que confirmarmos, voce recebera uma mensagem.\n` +
        `Precisando cancelar: ${cancelUrl}\n\nAte breve.`
      await this.sendWhatsApp(booking.patientPhone, patientMsg, page.psychologistId)
    }

    // Para o psicólogo — WhatsApp + e-mail
    if (page.psychologist?.phone) {
      const psychMsg =
        `*Nova solicitacao de sessao*\n\n` +
        `Pessoa: ${booking.patientName}\n` +
        `Data: ${booking.date} as ${String(booking.time).slice(0, 5)}\n` +
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
    const cancelUrl = this.getCancellationUrl(booking)
    const first = booking.patientName.split(' ')[0]

    // WhatsApp para o paciente
    if (booking.patientPhone) {
      const msg =
        `Ola, ${first}!\n\n` +
        `Sua sessao foi confirmada para *${booking.date}* as *${String(booking.time).slice(0, 5)}*.\n\n` +
        `Precisando cancelar: ${cancelUrl}\n\nNos vemos la.`
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

  async sendBookingCancellation(booking: any): Promise<void> {
    const psychologist = booking.psychologist
    const prefs = (psychologist?.preferences ?? {}) as Record<string, any>
    const phone = prefs.whatsapp || psychologist?.phone
    const reason = booking.cancellationReason?.trim()
    const reasonLine = reason ? `\nMotivo: ${reason}` : ''
    const msg =
      `Sessao cancelada pelo paciente\n\n` +
      `Pessoa: ${booking.patientName}\n` +
      `Data: ${booking.date} as ${String(booking.time).slice(0, 5)}` +
      reasonLine

    if (phone) {
      await this.sendWhatsApp(phone, msg, booking.psychologistId)
    }
    if (psychologist?.email) {
      await this.email.sendBookingCancellation(
        booking.patientName,
        psychologist.email,
        booking.date,
        String(booking.time).slice(0, 5),
        reason,
      )
    }

    this.logger.log(`[Booking] Cancelamento enviado ao psicólogo: ${booking.patientName}`)
  }

  async sendPaymentReminder(booking: any, pixKey?: string): Promise<void> {
    if (!booking.patientPhone) return
    const firstName = booking.patientName.split(' ')[0]
    const msg =
      `Ola, ${firstName}!\n\n` +
      `Passando para lembrar sobre o pagamento da nossa sessao ` +
      `(*R$ ${Number(booking.amount).toFixed(2)}*).\n\n` +
      (pixKey ? `Chave PIX: \`${pixKey}\`\n\n` : '') +
      `Qualquer duvida, e so falar.`
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

  private getCancellationUrl(booking: any): string {
    return booking.cancellationCode
      ? `${this.BASE_URL}/c/${booking.cancellationCode}`
      : `${this.BASE_URL}/agendar/cancelar/${booking.confirmationToken}`
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
