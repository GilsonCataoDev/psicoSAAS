import { BadGatewayException, Injectable, Logger, Optional, ServiceUnavailableException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { EmailLog } from './entities/email-log.entity'
import { EmailSuppression } from './entities/email-suppression.entity'
import { blindIndex } from '../../common/crypto/encrypt.util'

interface Attachment {
  filename: string
  content: string // base64
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  attachments?: Attachment[]
}

const DEFAULT_SEND_INTERVAL_MS = 1200
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private readonly from: string
  private readonly replyTo: string
  private readonly apiKey: string
  private readonly enabled: boolean
  private readonly frontendUrl: string
  private readonly sendIntervalMs: number
  private readonly rateLimitCooldownMs: number
  private queue: Promise<void> = Promise.resolve()
  private lastSentAt = 0
  private rateLimitedUntil = 0

  constructor(
    private cfg: ConfigService,
    @Optional() @InjectRepository(EmailLog) private readonly logs?: Repository<EmailLog>,
    @Optional() @InjectRepository(EmailSuppression) private readonly suppressions?: Repository<EmailSuppression>,
  ) {
    this.apiKey = cfg.get<string>('RESEND_API_KEY') ?? ''
    this.from = cfg.get<string>('RESEND_FROM') ?? 'UseCognia <noreply@usecognia.com.br>'
    this.replyTo = cfg.get<string>('RESEND_REPLY_TO') ?? 'suporte@usecognia.com.br'
    this.enabled = !!this.apiKey
    this.frontendUrl = cfg.get('FRONTEND_URL') ?? 'http://localhost:3000'
    this.sendIntervalMs = this.positiveNumber(cfg.get<string>('EMAIL_SEND_INTERVAL_MS'), DEFAULT_SEND_INTERVAL_MS)
    this.rateLimitCooldownMs = this.positiveNumber(
      cfg.get<string>('EMAIL_RATE_LIMIT_COOLDOWN_MS'),
      DEFAULT_RATE_LIMIT_COOLDOWN_MS,
    )
  }

  async send(opts: SendEmailOptions): Promise<void> {
    const queued = this.queue.then(() => this.deliver(opts))
    this.queue = queued.catch(() => undefined)
    return queued
  }

  isRateLimited(): boolean {
    return Date.now() < this.rateLimitedUntil
  }

  getRateLimitRetryAfterMs(): number {
    return Math.max(0, this.rateLimitedUntil - Date.now())
  }

  private async deliver(opts: SendEmailOptions): Promise<void> {
    if (!this.enabled) {
      this.logger.warn(`[Email desativado] RESEND_API_KEY ausente. subjectChars=${opts.subject.length}`)
      throw new ServiceUnavailableException('Envio de e-mail nao configurado')
    }

    if (await this.suppressions?.exist({
      where: { emailHash: blindIndex(opts.to, 'email-suppression') },
    })) {
      this.logger.warn(`[Email] Envio bloqueado — endereco suprimido (bounce/spam previo)`)
      this.writeLog(opts.to, opts.subject, 'suppressed', 'Endereco na lista de supressao')
      return
    }

    try {
      await this.waitForProviderWindow()
      const unsubscribeUrl = this.appUrl('/configuracoes')
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: opts.to,
          reply_to: this.replyTo,
          subject: opts.subject,
          html: opts.html,
          text: this.htmlToText(opts.html),
          // Provedores como Gmail/Yahoo penalizam remetentes sem opcao de
          // descadastro; o link aponta para a mesma pagina de preferencias
          // ja linkada no rodape do e-mail.
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:${this.replyTo}?subject=descadastrar>`,
          },
          ...(opts.attachments?.length ? { attachments: opts.attachments } : {}),
        }),
      })
      if (!res.ok) {
        const err = await res.text().catch(() => '')

        if (res.status === 429) {
          this.logger.warn('[Resend] Limite de envio atingido status=429')
          this.startRateLimitCooldown(res.headers.get('retry-after'))
          throw new ServiceUnavailableException(
            'Envio de e-mail temporariamente limitado pelo provedor. Tentaremos novamente depois.',
          )
        }

        this.logger.error(`[Resend] Erro ao enviar email status=${res.status}`)

        if (err.includes('domain is not verified')) {
          throw new ServiceUnavailableException(
            'Envio de e-mail indisponivel: dominio ainda nao verificado no provedor.',
          )
        }

        throw new BadGatewayException(`Nao foi possivel enviar o e-mail (status=${res.status})`)
      }
      this.logger.log(`[Resend] Email enviado subjectChars=${opts.subject.length}`)
      this.writeLog(opts.to, opts.subject, 'sent', null)
    } catch (err) {
      if (err instanceof BadGatewayException || err instanceof ServiceUnavailableException) {
        this.writeLog(opts.to, opts.subject, 'failed', (err as Error).message)
        throw err
      }
      this.logger.error(`[Resend] Falha de conexao type=${err instanceof Error ? err.name : 'unknown'}`)
      this.writeLog(opts.to, opts.subject, 'failed', (err as Error)?.message ?? 'unknown')
      throw new BadGatewayException('Nao foi possivel conectar ao servico de e-mail')
    }
  }

  private async waitForProviderWindow(): Promise<void> {
    const now = Date.now()
    if (now < this.rateLimitedUntil) {
      const seconds = Math.ceil((this.rateLimitedUntil - now) / 1000)
      throw new ServiceUnavailableException(`Envio de e-mail em cooldown por limite do provedor (${seconds}s).`)
    }

    const nextAllowedAt = this.lastSentAt + this.sendIntervalMs
    const waitMs = nextAllowedAt - now
    if (waitMs > 0) {
      await new Promise(resolve => setTimeout(resolve, waitMs))
    }
    // Marca o slot ANTES do envio: falhas também consomem a janela e não
    // disparam o próximo email imediatamente, evitando burst pós-erro.
    this.lastSentAt = Date.now()
  }

  private startRateLimitCooldown(retryAfter: string | null): void {
    const retryAfterMs = this.retryAfterToMs(retryAfter)
    const cooldownMs = Math.max(retryAfterMs, this.rateLimitCooldownMs)
    this.rateLimitedUntil = Date.now() + cooldownMs
    this.logger.warn(`[Resend] Rate limit ativo. Pausando envios por ${Math.ceil(cooldownMs / 1000)}s.`)
  }

  private retryAfterToMs(value: string | null): number {
    if (!value) return 0
    const seconds = Number(value)
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000

    const date = new Date(value).getTime()
    if (Number.isFinite(date)) return Math.max(0, date - Date.now())
    return 0
  }

  private positiveNumber(value: string | undefined, fallback: number): number {
    const number = Number(value)
    return Number.isFinite(number) && number > 0 ? number : fallback
  }

  // ─── Templates ────────────────────────────────────────────────────────────

  async sendWelcome(name: string, email: string) {
    const firstName = this.escapeHtml(name.split(' ')[0])
    await this.send({
      to: email,
      subject: 'Bem-vindo(a) à UseCognia',
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:28px">Olá, ${firstName}!</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Sua conta foi criada com sucesso no <strong>plano gratuito</strong>, sem cartão.
          Quando quiser, você poderá testar o plano Pro por 14 dias sem cobrança automática.
        </p>
        <p style="color:#555;font-size:16px;line-height:1.6">Veja o que você pode fazer agora:</p>
        <ul style="color:#555;font-size:15px;line-height:2">
          <li>Configure sua <a href="${this.appUrl('/agenda')}" style="color:#2F7657">disponibilidade de horários</a></li>
          <li>Adicione suas <a href="${this.appUrl('/pacientes')}" style="color:#2F7657">primeiras pessoas</a></li>
          <li>Ative sua <a href="${this.appUrl('/agendamentos')}" style="color:#2F7657">página de agendamento público</a></li>
        </ul>
        <a href="${this.frontendUrl}" style="display:inline-block;background:#2F7657;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:16px">
          Acessar minha conta
        </a>
      `),
    })
  }

  async sendPasswordReset(name: string, email: string, resetToken: string) {
    const link = `${this.frontendUrl}/redefinir-senha?token=${encodeURIComponent(resetToken)}`
    await this.send({
      to: email,
      subject: 'Redefinir sua senha — UseCognia',
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:24px">Redefinir senha</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Olá, ${this.escapeHtml(name.split(' ')[0])}! Recebemos uma solicitação para redefinir a senha da sua conta.
        </p>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Este link é válido por <strong>2 horas</strong>.
        </p>
        <a href="${link}" style="display:inline-block;background:#2F7657;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:8px;margin-bottom:16px">
          Redefinir minha senha
        </a>
        <p style="color:#999;font-size:13px">
          Se você não solicitou isso, ignore este e-mail. Sua senha permanece a mesma.
        </p>
      `),
    })
  }

  async sendEmailVerification(name: string, email: string, verificationToken: string) {
    const link = `${this.frontendUrl}/verificar-email?token=${encodeURIComponent(verificationToken)}`
    await this.send({
      to: email,
      subject: 'Confirme seu e-mail — UseCognia',
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:24px">Confirme seu e-mail</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Olá, ${this.escapeHtml(name.split(' ')[0])}! Clique no botão abaixo para confirmar o e-mail da sua conta UseCognia.
        </p>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Este link é válido por <strong>48 horas</strong>.
        </p>
        <a href="${link}" style="display:inline-block;background:#2F7657;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:8px;margin-bottom:16px">
          Confirmar e-mail
        </a>
        <p style="color:#999;font-size:13px">
          Se você não criou uma conta na UseCognia, ignore este e-mail.
        </p>
      `),
    })
  }

  async sendBookingRequest(patientName: string, psychologistEmail: string, date: string, time: string, confirmUrl: string) {
    const safePatientName = this.escapeHtml(patientName)
    const safeDate = this.escapeHtml(date)
    const safeTime = this.escapeHtml(time)
    await this.send({
      to: psychologistEmail,
      subject: `Nova solicitação de sessão — ${patientName.replace(/[\r\n]/g, ' ')}`,
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:24px">Nova solicitação</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          <strong>${safePatientName}</strong> solicitou uma sessão para
          <strong>${safeDate}</strong> às <strong>${safeTime}</strong>.
        </p>
        <a href="${confirmUrl}" style="display:inline-block;background:#2F7657;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:8px">
          Ver e confirmar
        </a>
      `),
    })
  }

  async sendBookingConfirmation(
    patientName: string,
    patientEmail: string,
    date: string,
    time: string,
    cancelUrl: string,
    customMessage?: string | null,
  ) {
    const messageHtml = customMessage?.trim()
      ? `<p style="color:#555;font-size:16px;line-height:1.6;white-space:pre-line">${this.escapeHtml(customMessage.trim())}</p>`
      : `<p style="color:#555;font-size:16px;line-height:1.6">
          Ola, ${this.escapeHtml(patientName.split(' ')[0])}! Sua sessao para
          <strong>${this.escapeHtml(date)}</strong> as <strong>${this.escapeHtml(time)}</strong> foi confirmada.
        </p>`

    await this.send({
      to: patientEmail,
      subject: 'Sessão confirmada',
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:24px">Sua sessão foi confirmada</h1>
        ${messageHtml}
        <p style="color:#888;font-size:14px">
          Precisa cancelar? <a href="${cancelUrl}" style="color:#2F7657">Clique aqui</a> com pelo menos 24h de antecedência.
        </p>
      `),
    })
  }

  async sendBookingCancellation(
    patientName: string,
    psychologistEmail: string,
    date: string,
    time: string,
    reason?: string,
  ) {
    const safePatientName = this.escapeHtml(patientName)
    const safeDate = this.escapeHtml(date)
    const safeTime = this.escapeHtml(time)
    const safeReason = reason ? this.escapeHtml(reason) : ''
    await this.send({
      to: psychologistEmail,
      subject: `Sessão cancelada — ${patientName.replace(/[\r\n]/g, ' ')}`,
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:24px">Sessão cancelada</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          <strong>${safePatientName}</strong> cancelou a sessão de
          <strong>${safeDate}</strong> às <strong>${safeTime}</strong>.
        </p>
        ${safeReason ? `<p style="color:#555;font-size:15px;line-height:1.6"><strong>Motivo:</strong> ${safeReason}</p>` : ''}
      `),
    })
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    })[char]!)
  }

  async sendProUpgradeOffer(name: string, email: string) {
    const firstName = this.escapeHtml(name.trim().split(/\s+/)[0] || 'profissional')
    await this.send({
      to: email,
      subject: 'Novidades no UseCognia + Pro por R$ 34,90 no primeiro mês',
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:26px">Olá, ${firstName}!</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          O UseCognia ganhou novos recursos para deixar a rotina clínica mais organizada:
        </p>
        <ul style="color:#555;font-size:15px;line-height:1.9;padding-left:20px">
          <li>agenda e link público de agendamento;</li>
          <li>prontuário, documentos e assinatura digital;</li>
          <li>financeiro, lembretes e integração com WhatsApp;</li>
          <li>instrumentos e avaliação neuropsicológica;</li>
          <li>migração de anotações em papel para a ficha do paciente.</li>
        </ul>
        <div style="background:#eef8f3;border:1px solid #cfe5d9;border-radius:14px;padding:18px;margin:24px 0">
          <p style="margin:0;color:#21372d;font-size:17px;line-height:1.5">
            Para contas Free elegíveis, o <strong>primeiro mês do plano Pro sai por R$ 34,90</strong>.
            Depois, o valor volta para R$ 97,90 por mês. Sem fidelidade.
          </p>
        </div>
        <a href="${this.appUrl('/planos')}" style="display:inline-block;background:#2F7657;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600">
          Conhecer o plano Pro
        </a>
        <p style="color:#888;font-size:13px;line-height:1.5;margin-top:28px">
          Você recebeu esta mensagem por possuir uma conta no UseCognia.
          As preferências de comunicação podem ser alteradas em
          <a href="${this.appUrl('/configuracoes')}" style="color:#2F7657">Configurações</a>.
        </p>
      `),
    })
  }

  async sendTrialEndingReminder(name: string, email: string, daysLeft: number) {
    await this.send({
      to: email,
      subject: `Seu período grátis acaba em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''} — UseCognia`,
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:24px">Período de teste terminando</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Olá, ${this.escapeHtml(name.split(' ')[0])}! Seu período de teste acaba em <strong>${daysLeft} dia${daysLeft !== 1 ? 's' : ''}</strong>.
        </p>
        <p style="color:#555;font-size:16px;line-height:1.6">
          A cobrança do plano escolhido será feita no cartão cadastrado. Você ainda pode trocar de plano ou cancelar antes do fim do teste.
        </p>
        <a href="${this.appUrl('/planos')}" style="display:inline-block;background:#2F7657;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:8px">
          Gerenciar meu plano
        </a>
      `),
    })
  }

  async sendReferralReward(name: string, email: string, referredName: string) {
    const safeFirstName = this.escapeHtml(name.split(' ')[0])
    const safeReferredName = this.escapeHtml(referredName)
    await this.send({
      to: email,
      subject: 'Você ganhou 30 dias de benefício',
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:24px">Você ganhou 30 dias de benefício</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Parabéns, ${safeFirstName}! <strong>${safeReferredName}</strong> se cadastrou usando sua indicação.
          Liberamos 30 dias de benefício na sua conta.
        </p>
        <a href="${this.frontendUrl}" style="display:inline-block;background:#2F7657;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:8px">
          Acessar minha conta
        </a>
      `),
    })
  }

  async sendReferralWelcomeBonus(name: string, email: string, referrerName: string) {
    const safeFirstName = this.escapeHtml(name.split(' ')[0])
    const safeReferrerName = this.escapeHtml(referrerName)
    await this.send({
      to: email,
      subject: 'Você ganhou 30 dias de Pro de boas-vindas',
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:24px">Você ganhou 30 dias de Pro</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Olá, ${safeFirstName}! Como você se cadastrou pelo convite de <strong>${safeReferrerName}</strong>,
          liberamos 30 dias do plano Pro na sua conta — automação de WhatsApp, instrumentos clínicos e mais, sem custo.
        </p>
        <a href="${this.frontendUrl}" style="display:inline-block;background:#2F7657;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:8px">
          Acessar minha conta
        </a>
      `),
    })
  }

  async sendSessionReminder(opts: {
    patientName: string
    patientEmail: string
    date: string
    time: string
    psychologistName: string
  }) {
    const first = opts.patientName.split(' ')[0]
    const dateLabel = (() => {
      try {
        const [y, m, d] = opts.date.split('-').map(Number)
        return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
      } catch { return opts.date }
    })()
    const timeLabel = String(opts.time).slice(0, 5)

    await this.send({
      to: opts.patientEmail,
      subject: `Lembrete de sessão — ${dateLabel}`,
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:24px">Lembrete de sessão</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Olá, ${this.escapeHtml(first)}! Passando para lembrar que temos nosso encontro amanhã:
        </p>
        <div style="background:#f5f9f7;border-radius:12px;padding:16px 20px;margin:16px 0">
          <p style="margin:0;color:#2F7657;font-size:18px;font-weight:600">${this.escapeHtml(dateLabel)}</p>
          <p style="margin:4px 0 0;color:#555;font-size:16px">às ${this.escapeHtml(timeLabel)}</p>
        </div>
        <p style="color:#888;font-size:14px">
          Caso precise reagendar, entre em contato com ${this.escapeHtml(opts.psychologistName)}.
        </p>
      `),
    })
  }

  async sendDocumentEmail(opts: {
    to: string
    recipientName: string
    docTitle: string
    docTypeLabel: string
    psychologistName: string
    psychologistCrp: string
    signCode: string
    verificationUrl: string
    filename: string
    pdfBase64: string
  }) {
    const safeDocTypeLabel = this.escapeHtml(opts.docTypeLabel)
    const safeRecipientName = this.escapeHtml(opts.recipientName)
    const safeDocTitle = this.escapeHtml(opts.docTitle)
    const safePsychologistName = this.escapeHtml(opts.psychologistName)
    const safePsychologistCrp = this.escapeHtml(opts.psychologistCrp)
    const safeSignCode = this.escapeHtml(opts.signCode)
    await this.send({
      to: opts.to,
      subject: `${opts.docTypeLabel} — ${opts.psychologistName}`.replace(/[\r\n]/g, ' '),
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:22px">
          ${safeDocTypeLabel}
        </h1>
        <p style="color:#555;font-size:15px;line-height:1.6">
          Olá, ${safeRecipientName}. Segue em anexo o documento
          <strong>${safeDocTitle}</strong>, emitido por
          <strong>${safePsychologistName}</strong> (CRP ${safePsychologistCrp}).
        </p>
        <p style="color:#555;font-size:15px;line-height:1.6">
          Você pode verificar a autenticidade do documento a qualquer momento:
        </p>
        <a href="${opts.verificationUrl}"
           style="display:inline-block;background:#3f8866;color:white;padding:12px 24px;
                  border-radius:10px;text-decoration:none;font-weight:600;margin-top:4px;margin-bottom:16px">
          Verificar autenticidade
        </a>
        <p style="color:#aaa;font-size:12px">Código: ${safeSignCode}</p>
      `),
      attachments: [{ filename: opts.filename, content: opts.pdfBase64 }],
    })
  }

  // ─── Layout base ─────────────────────────────────────────────────────────

  private writeLog(to: string, subject: string, status: 'sent' | 'failed' | 'suppressed', error: string | null): void {
    if (!this.logs) return
    this.logs.save(this.logs.create({
      to,
      toHash: blindIndex(to, 'email-log-recipient'),
      subject: subject.slice(0, 255),
      status,
      error: error ? error.slice(0, 500) : null,
    }))
      .catch(e => this.logger.warn(`[EmailLog] Falha ao gravar log: ${e?.message}`))
  }

  private wrap(content: string): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 16px">
    <tr><td>
      <table width="100%" max-width="520" cellpadding="0" cellspacing="0"
             style="max-width:520px;margin:0 auto;background:white;border-radius:24px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.06)">
        <!-- Header -->
        <tr><td style="background:#2F7657;padding:24px 32px">
          <p style="margin:0;color:white;font-size:20px;font-weight:600">
            Use<span style="opacity:0.8">Cognia</span>
          </p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #f0f0f0">
          <p style="margin:0;color:#aaa;font-size:12px;line-height:1.6">
            UseCognia · Gestão clínica com cuidado<br>
            <a href="${this.appUrl('/configuracoes')}" style="color:#aaa">Gerenciar preferências de e-mail</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  }

  /**
   * Gera a versao texto-puro a partir do HTML. E-mails somente-HTML
   * pontuam pior em vários filtros anti-spam (ex: regras do SpamAssassin
   * que penalizam a ausência de multipart/alternative); um "text" simples
   * ja e suficiente para evitar essa penalidade, mesmo sem formatação rica.
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  private appUrl(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`
    return `${this.frontendUrl}/#${normalized}`
  }
}
