import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EmailService } from '../email/email.service'

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
  ) {
    this.BASE_URL     = cfg.get('FRONTEND_URL') ?? 'http://localhost:3000'
    this.WA_URL       = cfg.get('WHATSAPP_API_URL') ?? ''
    this.WA_KEY       = cfg.get('WHATSAPP_API_KEY') ?? ''
    this.WA_INSTANCE  = cfg.get('WHATSAPP_INSTANCE') ?? 'default'
    this.waEnabled    = !!(this.WA_URL && this.WA_KEY && cfg.get('NODE_ENV') === 'production')
  }

  // ─── Envio via WhatsApp (Evolution API) ──────────────────────────────────

  private async sendWhatsApp(phone: string, text: string): Promise<void> {
    if (!this.waEnabled) {
      this.logger.log(`[WhatsApp DEV] ${phone}: ${text.slice(0, 60)}...`)
      return
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
      }
    } catch (err) {
      this.logger.error('[WhatsApp] Falha de conexão', err)
    }
  }

  // ─── Agendamentos internos ─────────────────────────────────────────────────

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
    await this.sendWhatsApp(patient.phone, msg)
  }

  async sendPaymentRequest(patient: any, amount: number, pixKey?: string): Promise<void> {
    if (!patient?.phone) return
    const firstName = patient.name.split(' ')[0]
    const msg =
      `Olá, ${firstName}! 💙\n\n` +
      `O valor da nossa sessão é R$ ${amount.toFixed(2)}.\n\n` +
      (pixKey ? `PIX: \`${pixKey}\`\n\n` : '') +
      `Obrigada! 🌿`
    await this.sendWhatsApp(patient.phone, msg)
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
      await this.sendWhatsApp(booking.patientPhone, patientMsg)
    }

    // Para o psicólogo — WhatsApp + e-mail
    if (page.psychologist?.phone) {
      const psychMsg =
        `📅 *Nova solicitação de sessão*\n\n` +
        `Pessoa: ${booking.patientName}\n` +
        `Data: ${booking.date} às ${booking.time}\n` +
        (booking.patientNotes ? `Obs: ${booking.patientNotes}\n` : '') +
        `\nConfirmar: ${confirmUrl}`
      await this.sendWhatsApp(page.psychologist.phone, psychMsg)
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
      await this.sendWhatsApp(booking.patientPhone, msg)
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
    await this.sendWhatsApp(booking.patientPhone, msg)
  }
}
