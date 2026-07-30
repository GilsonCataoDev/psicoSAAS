import { AnalyticsController } from './analytics.controller'

describe('AnalyticsController plan access', () => {
  const advancedStats = {
    activePatients: 8,
    sessionsThisMonth: 12,
    monthRevenue: 3200,
    todayAppointments: [],
    clinicIndicators: { attendanceRate: 90 },
    roi: { remindersSent: 10 },
    revenueChart: [{ mes: 'Jul', valor: 3200 }],
  }

  function makeController(subscription: any) {
    const service = {
      getDashboardStats: jest.fn().mockResolvedValue(advancedStats),
    }
    const subscriptions = {
      findOne: jest.fn().mockResolvedValue(subscription),
    }
    return {
      controller: new AnalyticsController(service as any, subscriptions as any),
      service,
    }
  }

  it('nao expoe indicadores avancados para plano Essencial', async () => {
    const { controller } = makeController({ plan: 'essencial', status: 'active' })

    const result = await controller.dashboard({ user: { id: 'psychologist-1' } })

    expect(result).toMatchObject({
      activePatients: 8,
      sessionsThisMonth: 12,
      monthRevenue: 3200,
      advancedAnalyticsLocked: true,
      requiredPlan: 'pro',
    })
    expect(result).not.toHaveProperty('clinicIndicators')
    expect(result).not.toHaveProperty('roi')
    expect(result).not.toHaveProperty('revenueChart')
  })

  it('exibe indicadores avancados para plano Pro ativo', async () => {
    const { controller } = makeController({ plan: 'pro', status: 'active' })

    const result = await controller.dashboard({ user: { id: 'psychologist-1' } })

    expect(result).toMatchObject({
      clinicIndicators: advancedStats.clinicIndicators,
      roi: advancedStats.roi,
      revenueChart: advancedStats.revenueChart,
      advancedAnalyticsLocked: false,
    })
  })

  it('bloqueia indicadores avancados quando o plano Pro esta inadimplente', async () => {
    const { controller } = makeController({ plan: 'pro', status: 'past_due' })

    const result = await controller.dashboard({ user: { id: 'psychologist-1' } })

    expect(result.advancedAnalyticsLocked).toBe(true)
    expect(result).not.toHaveProperty('clinicIndicators')
  })
})
