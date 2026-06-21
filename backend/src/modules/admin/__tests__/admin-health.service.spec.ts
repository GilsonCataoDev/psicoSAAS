import { AdminService } from '../admin.service'

describe('AdminService health scores', () => {
  it('queries the real billing table and returns a normalized score', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{
        id: 'user-1',
        name: 'Psi Teste',
        email: 'psi@example.com',
        lastActiveAt: new Date(),
        createdAt: new Date(),
        plan: 'pro',
        subscriptionStatus: 'active',
        patientCount: 5,
        sessionsLast30d: 10,
        hasFinancialLast30d: true,
        hasAiUsageLast30d: true,
      }]),
    }
    const service = new AdminService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
    )

    const result = await service.getHealthScores()
    const sql = dataSource.query.mock.calls[0][0] as string

    expect(sql).toContain('FROM billing_subscriptions s')
    expect(sql).toContain('au."userId" = u.id::text')
    expect(sql).not.toContain('FROM subscriptions s')
    expect(result).toEqual([expect.objectContaining({ score: 100, tier: 'healthy' })])
  })
})
