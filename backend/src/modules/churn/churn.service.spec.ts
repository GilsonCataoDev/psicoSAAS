import { ChurnService } from './churn.service'

describe('ChurnService — contato por WhatsApp', () => {
  it('inclui o telefone da psicóloga nas contas do dashboard', async () => {
    const ds = {
      query: jest.fn()
        .mockResolvedValueOnce([{
          id: 'psi-1', name: 'Psi Teste', email: 'psi@teste.com', phone: '11999998888',
          createdAt: new Date('2026-01-01'), lastActiveAt: new Date(), plan: 'pro',
          subscriptionStatus: 'active', patientCount: '1', sessionCount: '1',
          sessionCountLast30d: '1', appointmentCount: '1', appointmentCountLast30d: '1',
          hasWhatsappReminder: false, activeDaysLast14: '1', firstPatientAt: null,
          firstSessionAt: null, firstAppointmentAt: null,
        }])
        .mockResolvedValueOnce([{ count: '0' }]),
    }
    const activationRepo = { find: jest.fn().mockResolvedValue([]) }
    const service = new ChurnService(
      ds as any, {} as any, activationRepo as any, {} as any, {} as any,
    )

    const dashboard = await service.getDashboard()

    expect(ds.query.mock.calls[0][0]).toContain('u.phone')
    expect(dashboard.accounts[0]).toEqual(expect.objectContaining({ phone: '11999998888' }))
  })
})
