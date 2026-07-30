import { ForbiddenException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {
  KnownPlan,
  PLAN_LIMITS,
} from '../../common/plans'
import { PlanAccessService } from '../../common/plan-access/plan-access.service'
import { AiTextUsage } from './ai.service'
import { AiUsage } from './entities/ai-usage.entity'

@Injectable()
export class AiTextQuotaService {
  constructor(
    @InjectRepository(AiUsage) private readonly usage: Repository<AiUsage>,
    private readonly planAccess: PlanAccessService,
  ) {}

  async reserve(userId: string, email?: string): Promise<{ used: number; limit: number; plan: KnownPlan }> {
    const month = this.currentMonth()
    const plan = await this.currentPlan(userId, email)
    const limit = PLAN_LIMITS[plan].aiTextMonthlyLimit

    if (limit <= 0) {
      throw new ForbiddenException({
        message: 'Recursos de texto por IA estão disponíveis a partir do plano Essencial.',
        requiredPlan: 'essencial',
        currentPlan: plan,
        upgradeUrl: '/planos',
      })
    }

    await this.usage.createQueryBuilder().insert().values({ userId, month }).orIgnore().execute()
    const result = await this.usage
      .createQueryBuilder()
      .update()
      .set({ summaryRequests: () => '"summaryRequests" + 1' })
      .where(
        '"userId" = :userId AND month = :month AND "summaryRequests" < :limit',
        { userId, month, limit },
      )
      .execute()

    if (!result.affected) {
      const current = await this.usage.findOne({ where: { userId, month } })
      throw new ForbiddenException({
        message: `Limite mensal de textos por IA atingido (${current?.summaryRequests ?? limit}/${limit}).`,
        used: current?.summaryRequests ?? limit,
        limit,
        currentPlan: plan,
        upgradeUrl: plan === 'pro' ? undefined : '/planos',
      })
    }

    const current = await this.usage.findOne({ where: { userId, month } })
    return { used: current?.summaryRequests ?? 1, limit, plan }
  }

  async release(userId: string): Promise<void> {
    const month = this.currentMonth()
    await this.usage
      .createQueryBuilder()
      .update()
      .set({ summaryRequests: () => 'GREATEST("summaryRequests" - 1, 0)' })
      .where('"userId" = :userId AND month = :month', { userId, month })
      .execute()
  }

  async recordUsage(userId: string, usage?: AiTextUsage): Promise<void> {
    if (!usage) return
    const month = this.currentMonth()
    await this.usage
      .createQueryBuilder()
      .update()
      .set({
        aiInputTokens: () => `"aiInputTokens" + ${usage.inputTokens}`,
        aiOutputTokens: () => `"aiOutputTokens" + ${usage.outputTokens}`,
        aiCostUsdMicros: () => `"aiCostUsdMicros" + ${usage.costUsdMicros}`,
      })
      .where('"userId" = :userId AND month = :month', { userId, month })
      .execute()
  }

  private currentMonth(): string {
    return new Date().toISOString().slice(0, 7)
  }

  private async currentPlan(userId: string, email?: string): Promise<KnownPlan> {
    return this.planAccess.getCurrentPlan(userId, email)
  }
}
