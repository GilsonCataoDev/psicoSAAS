import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { Lead, LeadProfession } from './lead.entity'
import { CreateLeadDto } from './dto/create-lead.dto'
import { EmailService } from '../email/email.service'

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name)

  constructor(
    @InjectRepository(Lead)
    private readonly leads: Repository<Lead>,
    private readonly email: EmailService,
    private readonly cfg: ConfigService,
  ) {}

  async create(dto: CreateLeadDto): Promise<Lead> {
    const lead = this.leads.create({
      name:       dto.name,
      email:      dto.email,
      profession: dto.profession ?? LeadProfession.Psicologia,
      source:     dto.source ?? null,
    })

    let saved: Lead
    try {
      saved = await this.leads.save(lead)
    } catch (err: any) {
      if (err?.code === '23505') {
        const existing = await this.leads.findOneBy({ email: dto.email, source: dto.source ?? null })
        return existing!
      }
      throw err
    }

    this.notifyOwner(saved).catch(err =>
      this.logger.warn(`Falha ao enviar notificação de lead ${saved.id}: ${err?.message}`),
    )
    this.sendChecklist(saved).catch(err =>
      this.logger.warn(`Falha ao enviar checklist para lead ${saved.id}: ${err?.message}`),
    )

    return saved
  }

  private async sendChecklist(lead: Lead): Promise<void> {
    const firstName = lead.name.split(' ')[0]

    const checklists: Record<string, { title: string; items: string[] }> = {
      psicologia: {
        title: 'Checklist do Prontuário Psicológico — CFP Res. 001/2009',
        items: [
          'Identificação completa do paciente (nome, CPF, nascimento, contato de emergência)',
          'Demanda e queixa principal com data de início',
          'Histórico de saúde: doenças, medicamentos, histórico familiar',
          'Hipótese diagnóstica ou CID-10/CID-11 (quando aplicável)',
          'Instrumento psicológico utilizado e técnica terapêutica',
          'Registro de cada sessão: data, duração e evolução clínica',
          'Anamnese psicológica completa (infância, escolaridade, relações)',
          'Plano terapêutico com objetivos e prazos estimados',
          'Assinatura digital do psicólogo com CRP',
          'Prazo de guarda: mínimo 5 anos após término (25 anos para menores)',
        ],
      },
      fisioterapia: {
        title: 'Checklist do Prontuário Fisioterapêutico — COFFITO Res. 414/2012',
        items: [
          'Identificação do paciente e dados do encaminhamento',
          'Diagnóstico cinesiofuncional (não confundir com diagnóstico médico)',
          'Avaliação postural e biomecânica na admissão',
          'Escalas funcionais aplicadas (EVA, Barthel, Katz, MRC, Berg)',
          'Anamnese fisioterapêutica completa',
          'Objetivos do tratamento: curto, médio e longo prazo',
          'Plano de tratamento: técnicas, recursos e frequência semanal',
          'Evolução de cada sessão com data e assinatura do fisioterapeuta',
          'Reavaliações periódicas com comparativo de escalas',
          'Alta fisioterapêutica com relatório e orientações domiciliares',
        ],
      },
      nutricao: {
        title: 'Checklist do Prontuário Nutricional — CFN Res. 599/2018',
        items: [
          'Dados de identificação e contato do paciente',
          'Anamnese alimentar completa (hábitos, restrições, alergias)',
          'Recordatório alimentar de 24 horas',
          'Inquérito de frequência alimentar (QFCA)',
          'Avaliação antropométrica: peso, altura, IMC, circunferências e dobras',
          'Avaliação de exames laboratoriais com interpretação nutricional',
          'Diagnóstico nutricional (eutrofia, magreza, sobrepeso, obesidade)',
          'Prescrição dietética com valor calórico, macro e micronutrientes',
          'Objetivos e metas terapêuticas com prazos',
          'Evolução de cada consulta com data e assinatura com CRN',
        ],
      },
      estetica: {
        title: 'Checklist da Ficha de Anamnese Estética — LGPD + CDC',
        items: [
          'Identificação completa da cliente (nome, CPF, contato)',
          'Fototipo de Fitzpatrick (I a VI)',
          'Tipo de pele: seca, oleosa, mista, sensível ou madura',
          'Histórico de alergias, sensibilidades e contraindicações',
          'Medicamentos em uso que possam contraindicar procedimentos',
          'Histórico de procedimentos estéticos anteriores',
          'Termo de consentimento informado assinado por procedimento',
          'Ficha técnica: produto, concentração, técnica e parâmetros aplicados',
          'Registro de evolução por sessão com observações clínicas',
          'Controle de pacote: sessões contratadas vs. realizadas',
        ],
      },
    }

    const profKey = lead.profession as string
    const checklist = checklists[profKey] ?? checklists['psicologia']
    const itemsHtml = checklist.items
      .map((item, i) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;vertical-align:top;width:28px;color:#2F7657;font-weight:700;font-size:13px;">${String(i + 1).padStart(2, '0')}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#1a202c;line-height:1.5;">${item}</td>
        </tr>`)
      .join('')

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7fafc;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0d3d28;padding:28px 32px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.3px;">
              Use<span style="color:#4ade80;">Cognia</span>
            </p>
            <p style="margin:6px 0 0;font-size:13px;color:#86efac;">Sistema clínico para profissionais de saúde</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 24px;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#2F7657;">Seu checklist</p>
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">${checklist.title}</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
              Olá, <strong>${firstName}</strong>! Aqui está o checklist que você pediu.<br>
              Use como referência para montar seu prontuário de acordo com as normas do conselho.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
              <tbody>${itemsHtml}</tbody>
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
              Esses campos já estão todos disponíveis no prontuário do UseCognia — formatados e organizados por profissão.
            </p>
          </td>
        </tr>
        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 32px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#2F7657;border-radius:8px;">
                  <a href="https://usecognia.com.br/cadastro?utm_source=checklist&utm_medium=email&utm_campaign=${profKey}"
                     style="display:inline-block;padding:13px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                    Teste grátis por 7 dias →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">Sem cartão de crédito. Cancele quando quiser.</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              Você recebeu este e-mail porque preencheu o formulário no site usecognia.com.br.<br>
              Dúvidas? Responda este e-mail ou escreva para <a href="mailto:contato@usecognia.com.br" style="color:#2F7657;">contato@usecognia.com.br</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    await this.email.send({
      to:      lead.email,
      subject: `${firstName}, seu checklist de prontuário chegou — UseCognia`,
      html,
    })
  }

  private async notifyOwner(lead: Lead): Promise<void> {
    const to =
      this.cfg.get<string>('LEAD_NOTIFICATION_EMAIL') ||
      this.cfg.get<string>('MAIL_FROM')

    if (!to) {
      this.logger.debug('LEAD_NOTIFICATION_EMAIL não configurado — notificação de lead omitida')
      return
    }

    const dataBr = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(lead.createdAt)

    const body =
      `Novo lead capturado em ${dataBr}\n\n` +
      `Nome:      ${lead.name}\n` +
      `E-mail:    ${lead.email}\n` +
      `Profissão: ${lead.profession}\n` +
      `Origem:    ${lead.source ?? '—'}\n`

    await this.email.send({
      to,
      subject: `[UseCognia] Novo lead: ${lead.name} (${lead.profession})`,
      html: `<pre style="font-family:monospace;white-space:pre-wrap">${body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`,
    })
  }
}
