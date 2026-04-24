import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { addMonths } from 'date-fns'
import { Referral } from './entities/referral.entity'
import { Subscription } from '../subscriptions/entities/subscription.entity'
import { User } from '../auth/entities/user.entity'
import { EmailService } from '../email/email.service'

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name)

  constructor(
    @InjectRepository(Referral)     private refs: Repository<Referral>,
    @InjectRepository(Subscription) private subs: Repository<Subscription>,
    private email: EmailService,
  ) {}

  // Gera ou retorna o código de indicação do usuário
  async getOrCreateCode(user: User): Promise<Referral> {
    let ref = await this.refs.findOne({ where: { referrerId: user.id, referredId: undefined } })
    if (ref) return ref

    const base = user.name
      .split(' ')[0]
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 6)
    const suffix = Math.random().toString(36).slice(2, 5).toUpperCase()
    const code = `${base}${suffix}`

    ref = this.refs.create({ referrerId: user.id, code })
    return this.refs.save(ref)
  }

  // Chamado no registro quando vem ?ref=XXXX
  async applyReferral(code: string, newUser: User): Promise<void> {
    const ref = await this.refs.findOne({
      where: { code: code.toUpperCase(), referredId: undefined },
      relations: ['referrer'],
    })
    if (!ref || ref.referrerId === newUser.id) return   // inválido ou auto-referral

    ref.referredId = newUser.id
    await this.refs.save(ref)

    // Verifica se o indicado assinar → dá recompensa ao indicador
    this.logger.log(`[Referral] ${ref.referrer.name} indicou ${newUser.name}`)
  }

  // Chamado quando indicado ativa assinatura paga
  async grantRewardIfEligible(newUserId: string): Promise<void> {
    const ref = await this.refs.findOne({
      where: { referredId: newUserId, rewardGranted: false },
      relations: ['referrer'],
    })
    if (!ref) return

    // Estende a assinatura do indicador em 1 mês
    const sub = await this.subs.findOne({ where: { userId: ref.referrerId } })
    if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
      const currentEnd = sub.currentPeriodEnd ?? new Date()
      sub.currentPeriodEnd = addMonths(currentEnd, 1)
      await this.subs.save(sub)
    }

    ref.rewardGranted = true
    ref.rewardGrantedAt = new Date()
    await this.refs.save(ref)

    await this.email.sendReferralReward(
      ref.referrer.name,
      ref.referrer.email,
      (await this.refs.findOne({ where: { id: ref.id }, relations: ['referrer'] }))?.referrer?.name ?? 'um novo usuário',
    )

    this.logger.log(`[Referral] Recompensa concedida a ${ref.referrer.name}`)
  }

  async getStats(userId: string) {
    const refs = await this.refs.find({ where: { referrerId: userId } })
    return {
      totalInvited: refs.filter(r => r.referredId).length,
      totalRewarded: refs.filter(r => r.rewardGranted).length,
      code: refs[0]?.code ?? null,
    }
  }
}
