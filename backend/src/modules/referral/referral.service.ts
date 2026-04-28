import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Not, Repository } from 'typeorm'
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
   * Cria um registro de uso do código vinculando o novo usuário ao indicador.
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

    this.logger.log(`[Referral] ${master.referrer.name} indicou ${newUser.name}`)
  }

  /**
   * Chamado quando o indicado ativa uma assinatura paga.
   * Estende a assinatura do indicador em 1 mês.
   */
  async grantRewardIfEligible(newUserId: string): Promise<void> {
    const use = await this.refs.findOne({
      where: { referredId: newUserId, rewardGranted: false },
      relations: ['referrer'],
    })
    if (!use) return

    const sub = await this.subs.findOne({ where: { userId: use.referrerId } })
    if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
      const currentEnd = sub.currentPeriodEnd ?? new Date()
      sub.currentPeriodEnd = addMonths(currentEnd, 1)
      await this.subs.save(sub)
    }

    use.rewardGranted = true
    use.rewardGrantedAt = new Date()
    await this.refs.save(use)

    await this.email.sendReferralReward(
      use.referrer.name,
      use.referrer.email,
      newUserId,
    ).catch(() => {})

    this.logger.log(`[Referral] Recompensa concedida a ${use.referrer.name}`)
  }

  async getStats(userId: string) {
    const master = await this.refs.findOne({
      where: { referrerId: userId, referredId: IsNull() },
    })

    const uses = await this.refs.find({
      where: { referrerId: userId, referredId: Not(IsNull()) },
    })

    return {
      code:          master?.code ?? null,
      totalInvited:  uses.length,
      totalRewarded: uses.filter(r => r.rewardGranted).length,
    }
  }
}
