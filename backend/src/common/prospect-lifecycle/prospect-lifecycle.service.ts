import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { Prospect } from '../../modules/prospecting/entities/prospect.entity'
import { ProspectActivity } from '../../modules/prospecting/entities/prospect-activity.entity'
import { normalizeEmail, normalizePhone } from '../../modules/prospecting/dedup/dedupe.service'

export interface RegisteredAccountIdentity {
  userId: string
  email?: string | null
  phone?: string | null
}

/**
 * Sincroniza apenas marcos comerciais da conta. Dados de pacientes e dados
 * clinicos nunca entram neste servico nem nas tabelas de prospeccao.
 */
@Injectable()
export class ProspectLifecycleService {
  constructor(
    @InjectRepository(Prospect) private readonly prospects: Repository<Prospect>,
    @InjectRepository(ProspectActivity) private readonly activities: Repository<ProspectActivity>,
  ) {}

  async markRegistered(identity: RegisteredAccountIdentity): Promise<boolean> {
    const email = normalizeEmail(identity.email)
    const phone = normalizePhone(identity.phone)
    if (!email && !phone) return false

    const query = this.prospects.createQueryBuilder('prospect')
      .where('prospect.deletedAt IS NULL')
      .andWhere('prospect.doNotContact = false')
      .andWhere('prospect.status != :blockedStatus', { blockedStatus: 'do_not_contact' })
      .andWhere('(prospect.linkedUserId IS NULL OR prospect.linkedUserId = :userId)', { userId: identity.userId })
      .andWhere(new Brackets(match => {
        if (email) match.where('LOWER(prospect.professionalEmail) = :email', { email })
        if (phone) {
          const digits = "REGEXP_REPLACE(COALESCE(prospect.professionalPhone, ''), '[^0-9]', '', 'g')"
          const normalizedPhone = `CASE WHEN LENGTH(${digits}) > 11 AND LEFT(${digits}, 2) = '55' THEN SUBSTRING(${digits} FROM 3) ELSE ${digits} END`
          const expression = `${normalizedPhone} = :phone`
          if (email) match.orWhere(expression, { phone })
          else match.where(expression, { phone })
        }
      }))
      .orderBy('prospect.createdAt', 'DESC')

    const prospect = await query.getOne()
    if (!prospect) return false

    const previousStatus = prospect.status
    const now = new Date()
    prospect.linkedUserId = identity.userId
    prospect.registeredAt ??= now
    if (prospect.status !== 'activated') prospect.status = 'registered'
    await this.prospects.save(prospect)

    await this.recordStatusChange(prospect.id, identity.userId, previousStatus, prospect.status)
    return true
  }

  async markActivated(userId: string): Promise<boolean> {
    const prospect = await this.prospects.findOne({
      where: { linkedUserId: userId, doNotContact: false },
    })
    if (!prospect || prospect.deletedAt || prospect.status === 'activated') return false

    const previousStatus = prospect.status
    prospect.status = 'activated'
    prospect.activatedAt = new Date()
    prospect.registeredAt ??= prospect.activatedAt
    await this.prospects.save(prospect)
    await this.recordStatusChange(prospect.id, userId, previousStatus, 'activated')
    return true
  }

  private async recordStatusChange(
    prospectId: string,
    actorUserId: string,
    from: string,
    to: string,
  ): Promise<void> {
    if (from === to) return
    await this.activities.save(this.activities.create({
      prospectId,
      actorUserId,
      action: 'status_changed',
      notes: null,
      metadata: { from, to, source: 'account_lifecycle' },
    }))
  }
}
