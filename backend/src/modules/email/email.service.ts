import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

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

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private readonly from: string
  private readonly apiKey: string
  private readonly enabled: boolean
  private readonly frontendUrl: string

  constructor(private cfg: ConfigService) {
    this.apiKey = cfg.get<string>('RESEND_API_KEY') ?? ''
    this.from = cfg.get<string>('RESEND_FROM') ?? 'UseCognia <noreply@usecognia.com.br>'
    this.enabled = !!this.apiKey
    this.frontendUrl = cfg.get('FRONTEND_URL') ?? 'http://localhost:3000'
  }

  async send(opts: SendEmailOptions): Promise<void> {
    if (!this.enabled) {
      this.logger.warn(`[Email desativado] RESEND_API_KEY ausente. Para: ${opts.to} | Assunto: ${opts.subject}`)
      throw new ServiceUnavailableException('Envio de e-mail nao configurado')
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: opts.to,
          subject: opts.subject,
          html: opts.html,
          ...(opts.attachments?.length ? { attachments: opts.attachments } : {}),
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        this.logger.error(`[Resend] Erro ao enviar email: ${err}`)

        if (err.includes('domain is not verified')) {
          throw new ServiceUnavailableException(
            'Envio de e-mail indisponivel: dominio ainda nao verificado no provedor.',
          )
        }

        throw new BadGatewayException('Nao foi possivel enviar o e-mail')
      }
      this.logger.log(`[Resend] Email enviado para ${opts.to}: ${opts.subject}`)
    } catch (err) {
      if (err instanceof BadGatewayException || err instanceof ServiceUnavailableException) throw err
      this.logger.error('[Resend] Falha de conexão', err)
      throw new BadGatewayException('Nao foi possivel conectar ao servico de e-mail')
    }
  }

  // ─── Templates ────────────────────────────────────────────────────────────

  async sendWelcome(name: string, email: string) {
    const firstName = name.split(' ')[0]
    await this.send({
      to: email,
      subject: 'Bem-vindo(a) à UseCognia',
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:28px">Olá, ${firstName}!</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Sua conta foi criada com sucesso. Você tem <strong>7 dias grátis</strong>
          para explorar o plano escolhido. A cobrança só acontece ao fim do teste.
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
    const link = `${this.frontendUrl}/#/redefinir-senha?token=${encodeURIComponent(resetToken)}`
    await this.send({
      to: email,
      subject: 'Redefinir sua senha — UseCognia',
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:24px">Redefinir senha</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Olá, ${name.split(' ')[0]}! Recebemos uma solicitação para redefinir a senha da sua conta.
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
    const link = `${this.frontendUrl}/#/verificar-email?token=${encodeURIComponent(verificationToken)}`
    await this.send({
      to: email,
      subject: 'Confirme seu e-mail — UseCognia',
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:24px">Confirme seu e-mail</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Olá, ${name.split(' ')[0]}! Clique no botão abaixo para confirmar o e-mail da sua conta UseCognia.
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
    await this.send({
      to: psychologistEmail,
      subject: `Nova solicitação de sessão — ${patientName}`,
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:24px">Nova solicitação</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          <strong>${patientName}</strong> solicitou uma sessão para
          <strong>${date}</strong> às <strong>${time}</strong>.
        </p>
        <a href="${confirmUrl}" style="display:inline-block;background:#2F7657;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:8px">
          Ver e confirmar
        </a>
      `),
    })
  }

  async sendBookingConfirmation(patientName: string, patientEmail: string, date: string, time: string, cancelUrl: string) {
    await this.send({
      to: patientEmail,
      subject: 'Sessão confirmada',
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:24px">Sua sessão foi confirmada</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Olá, ${patientName.split(' ')[0]}! Sua sessão para
          <strong>${date}</strong> às <strong>${time}</strong> foi confirmada.
        </p>
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

  async sendTrialEndingReminder(name: string, email: string, daysLeft: number) {
    await this.send({
      to: email,
      subject: `Seu período grátis acaba em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''} — UseCognia`,
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:24px">Período de teste terminando</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Olá, ${name.split(' ')[0]}! Seu período de teste acaba em <strong>${daysLeft} dia${daysLeft !== 1 ? 's' : ''}</strong>.
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
    await this.send({
      to: email,
      subject: 'Você ganhou 1 mês grátis',
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:24px">Você ganhou 1 mês grátis</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Parabéns, ${name.split(' ')[0]}! <strong>${referredName}</strong> se cadastrou usando sua indicação.
          Seu próximo mês de assinatura está por nossa conta!
        </p>
        <a href="${this.frontendUrl}" style="display:inline-block;background:#2F7657;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:8px">
          Acessar minha conta
        </a>
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
    await this.send({
      to: opts.to,
      subject: `${opts.docTypeLabel} — ${opts.psychologistName}`,
      html: this.wrap(`
        <h1 style="color:#2F7657;font-weight:300;font-size:22px">
          ${opts.docTypeLabel}
        </h1>
        <p style="color:#555;font-size:15px;line-height:1.6">
          Olá, ${opts.recipientName}. Segue em anexo o documento
          <strong>${opts.docTitle}</strong>, emitido por
          <strong>${opts.psychologistName}</strong> (CRP ${opts.psychologistCrp}).
        </p>
        <p style="color:#555;font-size:15px;line-height:1.6">
          Você pode verificar a autenticidade do documento a qualquer momento:
        </p>
        <a href="${opts.verificationUrl}"
           style="display:inline-block;background:#3f8866;color:white;padding:12px 24px;
                  border-radius:10px;text-decoration:none;font-weight:600;margin-top:4px;margin-bottom:16px">
          Verificar autenticidade
        </a>
        <p style="color:#aaa;font-size:12px">Código: ${opts.signCode}</p>
      `),
      attachments: [{ filename: opts.filename, content: opts.pdfBase64 }],
    })
  }

  // ─── Layout base ─────────────────────────────────────────────────────────

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

  private appUrl(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`
    return `${this.frontendUrl}/#${normalized}`
  }
}
