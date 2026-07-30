import { ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PlanGuard } from '../../common/guards/plan.guard'
import { NeuropsychAssessmentsController } from './neuropsych-assessments.controller'

describe('NeuropsychAssessmentsController plan access', () => {
  function context(user: { id: string; email?: string }) {
    return {
      getHandler: () => NeuropsychAssessmentsController.prototype.list,
      getClass: () => NeuropsychAssessmentsController,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as any
  }

  function guardFor(subscription: any) {
    const currentPlan = subscription?.status === 'active' || subscription?.status === 'trialing'
      ? subscription.plan
      : 'free'
    const planAccess = {
      getCurrentPlan: jest.fn().mockResolvedValue(currentPlan),
      hasAccess: jest.fn().mockResolvedValue(['pro', 'premium'].includes(currentPlan)),
    }
    return new PlanGuard(new Reflector(), planAccess as any)
  }

  it('bloqueia o modulo completo para o plano Essencial', async () => {
    const guard = guardFor({ plan: 'essencial', status: 'active' })

    await expect(guard.canActivate(context({ id: 'psychologist-1' })))
      .rejects.toBeInstanceOf(ForbiddenException)
  })

  it('libera o modulo completo para o plano Pro ativo', async () => {
    const guard = guardFor({ plan: 'pro', status: 'active' })

    await expect(guard.canActivate(context({ id: 'psychologist-1' })))
      .resolves.toBe(true)
  })

  it('bloqueia o modulo quando o plano Pro esta inadimplente', async () => {
    const guard = guardFor({ plan: 'pro', status: 'past_due' })

    await expect(guard.canActivate(context({ id: 'psychologist-1' })))
      .rejects.toBeInstanceOf(ForbiddenException)
  })
})
