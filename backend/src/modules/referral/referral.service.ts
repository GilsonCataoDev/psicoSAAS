import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Not, Repository } from 'typeorm'
import { addDays } from 'date-fns'
import { Referral } from './entities/referral.entity'
import { Subscription } from '../billing/entities/subscription.entity'
import { User } from '../auth/entities/user.entity'
import { EmailService } from '../email/email.service'
import { Patient } from '../patients/entities/patient.entity'
import { Session } from '../sessions/entities/session.entity'
import { AsaasService } from '../billing/asaas.service'

const REQUIRED_PATIENTS = 3
const REQUIRED_SESSIONS = 2
const REQUIRED_DAYS_ACTIVE = 3
const REWARD_DAYS = 30

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name)

  constructor(
    @InjectRepository(Referral)     private refs: Repository<Referral>,
    @InjectRepository(Subscription) private subs: Repository<Subscription>,
    @InjectRepository(Patient)      private patients: Repository<Patient>,
    @InjectRepository(Session)      private sessions: Repository<Session>,
    @InjectRepository(User)         private users: Repository<User>,
    private email: EmailService,
    private asaas: AsaasService,
  ) {}

  /**
   * Gera ou retorna o código de indicação do usuário.
   * Armazena um registro "master" (sem referredId) por usuário para guardar o código.
   */
  async getOrCreateCode(user: User): Promise<string> {
    // Busca registro master: aquele SEM referredId (o "dono" do código)
    let master = await this.refs.findOne({
      where: { referrerId: user.id, referredId: IsNull() },
    })

    if (!master) {
      const base = user.name
        .split(' ')[0]
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .slice(0, 6)
      const suffix = Math.random().toString(36).slice(2, 5).toUpperCase()
      master = this.refs.create({ referrerId: user.id, code: `${base}${suffix}` })
      master = await this.refs.save(master)
    }

    return master.code
  }

  /**
   * Chamado no registro quando a URL contém ?ref=XXXX.
   * Cria um registro de uso do código vinculando o novo usuário ao indicador
   * e concede o bônus de boas-vindas (via de mão dupla: quem indica e quem é
   * indicado ganham). Diferente da recompensa do indicador — que só libera
   * quando o indicado atinge os criterios de qualificação — o bonus do
   * indicado é imediato, para reduzir o atrito de completar o cadastro.
   */
  async applyReferral(code: string, newUser: User): Promise<void> {
    // Encontra o registro master do código
    const master = await this.refs.findOne({
      where: { code: code.toUpperCase(), referredId: IsNull() },
      relations: ['referrer'],
    })
    if (!master) return                          // código inválido
    if (master.referrerId === newUser.id) return  // auto-indicação

    // Cria um registro de uso (novo referral com o mesmo código)
    const use = this.refs.create({
      referrerId: master.referrerId,
      code: master.code,
      referredId: newUser.id,
      rewardGranted: false,
    })
    await this.refs.save(use)
    await this.users.update(newUser.id, { referralCode: master.code })

    await this.grantProReward(newUser.id)
    await this.email.sendReferralWelcomeBonus(
      newUser.name,
      newUser.email,
      master.referrer?.name ?? 'um colega',
    ).catch(() => {})

    this.logger.log(`[Referral] indicacao registrada referrer=${master.referrerId} referred=${newUser.id} (bonus de boas-vindas concedido)`)
  }

  async grantRewardIfEligible(newUserId: string): Promise<void> {
    const use = await this.refs.findOne({
      where: { referredId: newUserId, rewardGranted: false },
      relations: ['referrer', 'referred'],
    })
    if (!use) return

    const progress = await this.getProgressForReferral(use)
    if (!progress.qualified) return

    await this.grantProReward(use.referrerId)

    use.rewardGranted = true
    use.rewardGrantedAt = new Date()
    await this.refs.save(use)

    await this.email.sendReferralReward(
      use.referrer.name,
      use.referrer.email,
      use.referred?.name ?? 'seu colega',
    ).catch(() => {})

    this.logger.log(`[Referral] recompensa concedida referrer=${use.referrerId}`)
  }

  async getStats(userId: string) {
    const master = await this.refs.findOne({
      where: { referrerId: userId, referredId: IsNull() },
    })

    const uses = await this.refs.find({
      where: { referrerId: userId, referredId: Not(IsNull()) },
      relations: ['referred'],
      order: { createdAt: 'DESC' },
    })

    for (const use of uses) {
      if (!use.rewardGranted && use.referredId) {
        await this.grantRewardIfEligible(use.referredId)
      }
    }

    const refreshedUses = await this.refs.find({
      where: { referrerId: userId, referredId: Not(IsNull()) },
      relations: ['referred'],
      order: { createdAt: 'DESC' },
    })

    const invited = await Promise.all(refreshedUses.map(async (ref) => {
      const progress = await this.getProgressForReferral(ref)
      return {
        id: ref.id,
        name: ref.referred?.name ?? 'Colega indicado',
        createdAt: ref.createdAt,
        rewardGranted: ref.rewardGranted,
        rewardGrantedAt: ref.rewardGrantedAt,
        progress,
      }
    }))

    return {
      code: master?.code ?? null,
      totalInvited: refreshedUses.length,
      totalRewarded: refreshedUses.filter(r => r.rewardGranted).length,
      pendingQualified: invited.filter(item => item.progress.qualified && !item.rewardGranted).length,
      rewardLabel: `${REWARD_DAYS} dias de beneficio`,
      criteria: {
        patients: REQUIRED_PATIENTS,
        sessions: REQUIRED_SESSIONS,
        daysActive: REQUIRED_DAYS_ACTIVE,
        emailVerified: true,
      },
      invited,
    }
  }

  private async getProgressForReferral(referral: Referral) {
    if (!referral.referredId) {
      return {
        patients: 0,
        sessions: 0,
        daysActive: 0,
        emailVerified: false,
        qualified: false,
      }
    }

    const user = referral.referred ?? await this.users.findOneBy({ id: referral.referredId })
    const [patients, sessions] = await Promise.all([
      this.patients.count({ where: { psychologistId: referral.referredId } }),
      this.sessions.count({ where: { psychologistId: referral.referredId } }),
    ])
    const daysActive = Math.max(0, Math.floor((Date.now() - new Date(referral.createdAt).getTime()) / 86400000))
    const emailVerified = Boolean(user?.emailVerified)

    return {
      patients,
      sessions,
      daysActive,
      emailVerified,
      qualified:
        patients >= REQUIRED_PATIENTS
        && sessions >= REQUIRED_SESSIONS
        && daysActive >= REQUIRED_DAYS_ACTIVE
        && emailVerified,
    }
  }

  private async grantProReward(userId: string): Promise<void> {
    const current = await this.subs.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    })
    const baseDate = current?.currentPeriodEnd && new Date(current.currentPeriodEnd).getTime() > Date.now()
      ? new Date(current.currentPeriodEnd)
      : new Date()
    const rewardEnd = addDays(baseDate, REWARD_DAYS)

    const sub = current ?? this.subs.create({ userId })
    if (current?.gatewaySubscriptionId) {
      const rewardEndDate = rewardEnd.toISOString().slice(0, 10)
      await this.asaas.updateSubscriptionNextDueDate(current.gatewaySubscriptionId, rewardEndDate)
      await this.asaas.postponeSubscriptionOpenPayments(current.gatewaySubscriptionId, rewardEndDate)
      current.currentPeriodEnd = rewardEnd
      current.cancelAtPeriodEnd = false
      if (current.status === 'past_due') current.status = 'active'
      await this.subs.save(current)
      return
    }

    Object.assign(sub, {
      userId,
      plan: 'pro',
      status: 'trialing',
      gatewayCustomerId: current?.gatewayCustomerId ?? null,
      gatewaySubscriptionId: current?.gatewaySubscriptionId ?? null,
      currentPeriodEnd: rewardEnd,
      trialEndsAt: rewardEnd,
      cancelAtPeriodEnd: false,
      hasUsedTrial: current?.hasUsedTrial ?? true,
    })
    await this.subs.save(sub)
  }
}
