import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/**
 * NotificationsService
 * Mensagens humanizadas via WhatsApp/e-mail.
 * PRINCÍPIO: empáticas, respeitosas e nunca robóticas.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)
  private readonly BASE_URL: string

  constructor(private cfg: ConfigService) {
    this.BASE_URL = cfg.get('FRONTEND_URL') ?? 'http://localhost:3000'
  }

  // ─── Agendamentos internos ─────────────────────────────────────────────────

  async scheduleReminder(appointment: any): Promise<void> {
    if (!appointment.patient?.phone) return
    const { patient, date, time } = appointment
    this.logger.log(`[Lembrete] ${patient.name} — ${date} ${time}`)
    // TODO: WhatsApp API
    // await this.whatsapp.sendText(patient.phone, this.buildSessionReminder(patient.name, time, 24))
  }

  async sendPaymentRequest(patient: any, amount: number, pixKey?: string): Promise<void> {
    if (!patient?.phone) return
    const firstName = patient.name.split(' ')[0]
    const msg =
      `Olá, ${firstName}! 💙\n\n` +
      `Quando puder, o valor da nossa sessão é R$ ${amount.toFixed(2)}.\n\n` +
      (pixKey ? `PIX: ${pixKey}\n\n` : '') +
      `Obrigada! 🌿`
    this.logger.log(`[Cobrança] ${patient.name}: R$ ${amount}`)
    // TODO: await this.whatsapp.sendText(patient.phone, msg)
  }

  // ─── Booking público ───────────────────────────────────────────────────────

  /** Notifica o psicólogo sobre nova solicitação + envia link de confirmação ao paciente */
  async sendBookingRequest(booking: any, page: any): Promise<void> {
    const confirmUrl = `${this.BASE_URL}/agendar/confirmar/${booking.confirmationToken}`
    const cancelUrl  = `${this.BASE_URL}/agendar/cancelar/${booking.confirmationToken}`

    // Para o paciente
    const patientMsg =
      `Olá, ${booking.patientName.split(' ')[0]}! 🌿\n\n` +
      `Recebemos sua solicitação para ${booking.date} às ${booking.time}.\n\n` +
      `Assim que confirmarmos, você receberá uma mensagem. ` +
      `Caso precise cancelar: ${cancelUrl}\n\n` +
      `Até breve! 💙`

    // Para o psicólogo
    const psychologistMsg =
      `Nova solicitação de agendamento! 📅\n\n` +
      `Pessoa: ${booking.patientName}\n` +
      `Data: ${booking.date} às ${booking.time}\n` +
      (booking.patientNotes ? `Observação: ${booking.patientNotes}\n` : '') +
      `\nConfirmar: ${confirmUrl}`

    this.logger.log(`[Booking] Nova solicitação de ${booking.patientName} — ${booking.date} ${booking.time}`)
    // TODO: enviar patientMsg ao paciente e psychologistMsg ao psicólogo via WhatsApp/e-mail
  }

  /** Confirmação enviada ao paciente após o psicólogo aceitar */
  async sendBookingConfirmation(booking: any): Promise<void> {
    const cancelUrl = `${this.BASE_URL}/agendar/cancelar/${booking.confirmationToken}`
    const firstName = booking.patientName.split(' ')[0]

    const msg =
      `Ótima notícia, ${firstName}! 🎉\n\n` +
      `Sua sessão foi confirmada para ${booking.date} às ${booking.time}.\n\n` +
      `Se precisar cancelar com antecedência: ${cancelUrl}\n\n` +
      `Nos vemos lá! 💙`

    this.logger.log(`[Booking] Confirmação enviada para ${booking.patientName}`)
    // TODO: await this.whatsapp.sendText(booking.patientPhone, msg)
  }

  /** Lembrete de pagamento */
  async sendPaymentReminder(booking: any, pixKey?: string): Promise<void> {
    const firstName = booking.patientName.split(' ')[0]
    const msg =
      `Olá, ${firstName}! 💙\n\n` +
      `Passando para lembrar sobre o pagamento da nossa sessão ` +
      `(R$ ${Number(booking.amount).toFixed(2)}).\n\n` +
      (pixKey ? `Chave PIX: ${pixKey}\n\n` : '') +
      `Qualquer dúvida, é só falar. 🌿`

    this.logger.log(`[Pagamento] Lembrete para ${booking.patientName}`)
    // TODO: await this.whatsapp.sendText(booking.patientPhone, msg)
  }

  // ─── Helpers privados ──────────────────────────────────────────────────────

  private buildSessionReminder(name: string, time: string, hoursAhead: number): string {
    const first = name.split(' ')[0]
    return hoursAhead === 24
      ? `Olá, ${first}! 🌿\n\nLembrando que temos nosso encontro amanhã às ${time}. Até lá! 💙`
      : `Olá, ${first}! ✨\nNosso encontro de hoje é às ${time}. Nos vemos em breve! 💙`
  }
}
