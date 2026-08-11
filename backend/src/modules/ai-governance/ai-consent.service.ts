import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'
import { Patient } from '../patients/entities/patient.entity'
import { AiConsentEvent, AiConsentScope } from './entities/ai-consent-event.entity'
import { AI_CONSENT_TEXTS } from './ai-consent-texts'

type Context = { ip?: string; userAgent?: string }

@Injectable()
export class AiConsentService {
  constructor(
    @InjectRepository(AiConsentEvent) private readonly events: Repository<AiConsentEvent>,
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
  ) {}

  async status(psychologistId: string, scope: AiConsentScope, patientId?: string) {
    await this.assertPatient(psychologistId, patientId)
    const event = await this.events.findOne({
      where: { psychologistId, scope, patientId: patientId ?? IsNull() },
      order: { createdAt: 'DESC' },
    })
    return { active: event?.action === 'accepted', acceptedAt: event?.action === 'accepted' ? event.createdAt : null, textVersion: event?.textVersion ?? null }
  }

  async assertActive(psychologistId: string, scope: AiConsentScope, patientId?: string): Promise<void> {
    const current = await this.status(psychologistId, scope, patientId)
    if (!current.active) {
      throw new ForbiddenException({
        message: 'Confirme o consentimento antes de usar este recurso.',
        consentRequired: true,
        scope,
        patientId: patientId ?? null,
      })
    }
  }

  async accept(psychologistId: string, scope: AiConsentScope, dto: any, context: Context) {
    await this.assertPatient(psychologistId, dto.patientId)
    const canonical = AI_CONSENT_TEXTS[scope]
    if (dto.textVersion !== canonical.version || dto.textSnapshot !== canonical.text) {
      throw new BadRequestException('Texto ou versao de consentimento invalido')
    }
    const current = await this.status(psychologistId, scope, dto.patientId)
    if (scope !== 'session_recording_transcription' && current.active && current.textVersion === canonical.version) return current
    await this.events.save(this.events.create({
      psychologistId, scope, patientId: dto.patientId ?? null, action: 'accepted',
      textVersion: canonical.version, textSnapshot: canonical.text, source: dto.source,
      ip: context.ip ?? null, userAgent: context.userAgent?.slice(0, 500) ?? null,
    }))
    return this.status(psychologistId, scope, dto.patientId)
  }

  async revoke(psychologistId: string, scope: AiConsentScope, patientId: string | undefined, context: Context) {
    const current = await this.status(psychologistId, scope, patientId)
    await this.events.save(this.events.create({
      psychologistId, scope, patientId: patientId ?? null, action: 'revoked',
      textVersion: current.textVersion ?? 'unknown', textSnapshot: 'Consentimento revogado',
      source: 'professional_acknowledgement', ip: context.ip ?? null,
      userAgent: context.userAgent?.slice(0, 500) ?? null,
    }))
    return { active: false }
  }

  private async assertPatient(psychologistId: string, patientId?: string): Promise<void> {
    if (!patientId) return
    if (!await this.patients.exist({ where: { id: patientId, psychologistId } })) {
      throw new BadRequestException('Paciente invalido para este consentimento')
    }
  }
}
