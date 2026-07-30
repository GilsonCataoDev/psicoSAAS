import { ChurnService } from './churn.service'

describe('ChurnService — contato por WhatsApp', () => {
  it('expõe apenas se a psicóloga possui telefone', async () => {
    const ds = {
      query: jest.fn()
        .mockResolvedValueOnce([{
          id: 'psi-1', name: 'Psi Teste', email: 'psi@teste.com', phone: 'ciphertext',
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
      ds as any, {} as any, activationRepo as any, {} as any, {} as any, {} as any,
    )

    const dashboard = await service.getDashboard()

    expect(ds.query.mock.calls[0][0]).toContain('u.phone')
    expect(dashboard.accounts[0]).toEqual(expect.objectContaining({ hasPhone: true }))
    expect(dashboard.accounts[0]).not.toHaveProperty('phone')
  })

  it('recalcula score e ativação sem repetir a consulta agregada por conta', async () => {
    const ds = {
      query: jest.fn().mockResolvedValue([{
        id: 'psi-1',
        name: 'Psi Teste',
        email: 'psi@teste.com',
        phone: null,
        createdAt: new Date('2026-01-01'),
        lastActiveAt: new Date(),
        plan: 'pro',
        subscriptionStatus: 'active',
        patientCount: '3',
        sessionCount: '1',
        sessionCountLast30d: '1',
        appointmentCount: '1',
        appointmentCountLast30d: '1',
        hasWhatsappReminder: false,
        activeDaysLast14: '1',
        firstPatientAt: null,
        firstSessionAt: null,
        firstAppointmentAt: null,
      }]),
    }
    const healthRepo = {
      findBy: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(value => value),
      save: jest.fn(value => value),
    }
    const activationRepo = {
      findBy: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(value => ({ ...value, activated: false })),
      save: jest.fn(value => value),
    }
    const alertRepo = {
      findBy: jest.fn().mockResolvedValue([]),
    }
    const service = new ChurnService(
      ds as any,
      healthRepo as any,
      activationRepo as any,
      alertRepo as any,
      {} as any,
      {} as any,
    )

    await expect(service.recalculateAll()).resolves.toEqual({ processed: 1, errors: 0 })
    expect(ds.query).toHaveBeenCalledTimes(1)
    expect(healthRepo.findBy).toHaveBeenCalledTimes(1)
    expect(activationRepo.findBy).toHaveBeenCalledTimes(1)
    expect(alertRepo.findBy).toHaveBeenCalledTimes(1)
    expect(healthRepo.findOne).not.toHaveBeenCalled()
    expect(activationRepo.findOne).not.toHaveBeenCalled()
    expect(healthRepo.save).toHaveBeenCalledTimes(1)
    expect(activationRepo.save).toHaveBeenCalledTimes(1)
  })
})
