"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let EmailService = EmailService_1 = class EmailService {
    constructor(cfg) {
        this.cfg = cfg;
        this.logger = new common_1.Logger(EmailService_1.name);
        this.from = 'PsicoSaaS <oi@psicosaas.com.br>';
        this.apiKey = cfg.get('RESEND_API_KEY') ?? '';
        this.enabled = !!this.apiKey && cfg.get('NODE_ENV') === 'production';
        this.frontendUrl = cfg.get('FRONTEND_URL') ?? 'http://localhost:3000';
    }
    async send(opts) {
        if (!this.enabled) {
            this.logger.log(`[Email DEV] Para: ${opts.to} | Assunto: ${opts.subject}`);
            return;
        }
        try {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ from: this.from, ...opts }),
            });
            if (!res.ok) {
                const err = await res.text();
                this.logger.error(`[Resend] Erro ao enviar email: ${err}`);
            }
        }
        catch (err) {
            this.logger.error('[Resend] Falha de conexão', err);
        }
    }
    async sendWelcome(name, email) {
        const firstName = name.split(' ')[0];
        await this.send({
            to: email,
            subject: 'Bem-vinda ao PsicoSaaS! 🌱',
            html: this.wrap(`
        <h1 style="color:#4a7c59;font-weight:300;font-size:28px">Olá, ${firstName}! 🌱</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Sua conta foi criada com sucesso. Você tem <strong>7 dias grátis</strong>
          para explorar todas as funcionalidades do plano Essencial.
        </p>
        <p style="color:#555;font-size:16px;line-height:1.6">Veja o que você pode fazer agora:</p>
        <ul style="color:#555;font-size:15px;line-height:2">
          <li>📅 Configure sua <a href="${this.frontendUrl}/agenda" style="color:#4a7c59">disponibilidade de horários</a></li>
          <li>👥 Adicione suas <a href="${this.frontendUrl}/pacientes" style="color:#4a7c59">primeiras pessoas</a></li>
          <li>🔗 Ative sua <a href="${this.frontendUrl}/agendamentos" style="color:#4a7c59">página de agendamento público</a></li>
        </ul>
        <a href="${this.frontendUrl}" style="display:inline-block;background:#4a7c59;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:16px">
          Acessar minha conta
        </a>
      `),
        });
    }
    async sendPasswordReset(name, email, resetToken) {
        const link = `${this.frontendUrl}/redefinir-senha?token=${resetToken}`;
        await this.send({
            to: email,
            subject: 'Redefinir sua senha — PsicoSaaS',
            html: this.wrap(`
        <h1 style="color:#4a7c59;font-weight:300;font-size:24px">Redefinir senha</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Olá, ${name.split(' ')[0]}! Recebemos uma solicitação para redefinir a senha da sua conta.
        </p>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Este link é válido por <strong>2 horas</strong>.
        </p>
        <a href="${link}" style="display:inline-block;background:#4a7c59;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:8px;margin-bottom:16px">
          Redefinir minha senha
        </a>
        <p style="color:#999;font-size:13px">
          Se você não solicitou isso, ignore este e-mail. Sua senha permanece a mesma.
        </p>
      `),
        });
    }
    async sendBookingRequest(patientName, psychologistEmail, date, time, confirmUrl) {
        await this.send({
            to: psychologistEmail,
            subject: `Nova solicitação de sessão — ${patientName}`,
            html: this.wrap(`
        <h1 style="color:#4a7c59;font-weight:300;font-size:24px">Nova solicitação 📅</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          <strong>${patientName}</strong> solicitou uma sessão para
          <strong>${date}</strong> às <strong>${time}</strong>.
        </p>
        <a href="${confirmUrl}" style="display:inline-block;background:#4a7c59;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:8px">
          Ver e confirmar
        </a>
      `),
        });
    }
    async sendBookingConfirmation(patientName, patientEmail, date, time, cancelUrl) {
        await this.send({
            to: patientEmail,
            subject: 'Sessão confirmada! 🎉',
            html: this.wrap(`
        <h1 style="color:#4a7c59;font-weight:300;font-size:24px">Sua sessão foi confirmada! 🎉</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Olá, ${patientName.split(' ')[0]}! Sua sessão para
          <strong>${date}</strong> às <strong>${time}</strong> foi confirmada.
        </p>
        <p style="color:#888;font-size:14px">
          Precisa cancelar? <a href="${cancelUrl}" style="color:#4a7c59">Clique aqui</a> com pelo menos 24h de antecedência.
        </p>
      `),
        });
    }
    async sendTrialEndingReminder(name, email, daysLeft) {
        await this.send({
            to: email,
            subject: `Seu período grátis acaba em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''} — PsicoSaaS`,
            html: this.wrap(`
        <h1 style="color:#e07b39;font-weight:300;font-size:24px">Período de teste terminando ⏰</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Olá, ${name.split(' ')[0]}! Seu período de teste acaba em <strong>${daysLeft} dia${daysLeft !== 1 ? 's' : ''}</strong>.
        </p>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Assine agora e continue com acesso a todos os recursos. Nenhum dado é perdido.
        </p>
        <a href="${this.frontendUrl}/planos" style="display:inline-block;background:#4a7c59;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:8px">
          Escolher meu plano
        </a>
      `),
        });
    }
    async sendReferralReward(name, email, referredName) {
        await this.send({
            to: email,
            subject: 'Você ganhou 1 mês grátis! 🎁',
            html: this.wrap(`
        <h1 style="color:#4a7c59;font-weight:300;font-size:24px">Você ganhou 1 mês grátis! 🎁</h1>
        <p style="color:#555;font-size:16px;line-height:1.6">
          Parabéns, ${name.split(' ')[0]}! <strong>${referredName}</strong> se cadastrou usando sua indicação.
          Seu próximo mês de assinatura está por nossa conta!
        </p>
        <a href="${this.frontendUrl}" style="display:inline-block;background:#4a7c59;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:8px">
          Acessar minha conta
        </a>
      `),
        });
    }
    wrap(content) {
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
        <tr><td style="background:#4a7c59;padding:24px 32px">
          <p style="margin:0;color:white;font-size:20px;font-weight:600">
            Psico<span style="opacity:0.8">SaaS</span>
          </p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #f0f0f0">
          <p style="margin:0;color:#aaa;font-size:12px;line-height:1.6">
            PsicoSaaS · Gestão clínica com cuidado 🌿<br>
            <a href="${this.frontendUrl}/configuracoes" style="color:#aaa">Gerenciar preferências de e-mail</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map