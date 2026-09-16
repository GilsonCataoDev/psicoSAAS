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

    return saved
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
