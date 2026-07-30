import { PatientsService } from './patients.service'
import { safeDecrypt } from '../../common/crypto/encrypt.util'

process.env.ENCRYPTION_KEY = 'patients-test-encryption-key-32-chars!'

describe('PatientsService — edição cadastral', () => {
  it('atualiza os dados do próprio paciente e permite limpar campos opcionais', async () => {
    const patient = {
      id: 'patient-1',
      psychologistId: 'psychologist-1',
      name: 'Nome anterior',
      email: 'anterior@exemplo.com',
      phone: '11999999999',
      status: 'paused',
      billingType: 'per_session',
      tags: [],
    }
    const repo = {
      findOne: jest.fn().mockResolvedValue(patient),
      save: jest.fn(async value => value),
    }
    const service = new PatientsService(
      repo as any,
      {} as any,
      {} as any,
      {} as any,
    )

    const updated = await service.update(
      patient.id,
      {
        name: 'Nome atualizado',
        email: null,
        phone: null,
        birthDate: '1990-05-10',
        tags: ['ansiedade'],
      } as any,
      patient.psychologistId,
    )

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: patient.id, psychologistId: patient.psychologistId },
    })
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Nome atualizado',
      email: null,
      phone: null,
      tags: ['ansiedade'],
    }))
    expect(safeDecrypt(repo.save.mock.calls[0][0].birthDate)).toBe('1990-05-10')
    expect(updated).toEqual(expect.objectContaining({
      name: 'Nome atualizado',
      email: null,
      phone: null,
      birthDate: '1990-05-10',
    }))
  })
  it('remove definitivamente o paciente do proprio psicologo', async () => {
    const patient = { id: 'patient-1', psychologistId: 'psychologist-1' }
    const repo = {
      findOne: jest.fn().mockResolvedValue(patient),
      remove: jest.fn().mockResolvedValue(patient),
    }
    const service = new PatientsService(repo as any, {} as any, {} as any, {} as any)

    await service.remove(patient.id, patient.psychologistId)

    expect(repo.remove).toHaveBeenCalledWith(patient)
  })

  it('usa sempre a assinatura mais recente para calcular o limite', async () => {
    const repo = { count: jest.fn().mockResolvedValue(12) }
    const planAccess = { getCurrentPlan: jest.fn().mockResolvedValue('essencial') }
    const service = new PatientsService(
      repo as any,
      {} as any,
      {} as any,
      planAccess as any,
    )

    await expect(service.getPlanUsage('psychologist-1')).resolves.toEqual({
      plan: 'essencial',
      limit: 50,
      count: 12,
    })
    expect(planAccess.getCurrentPlan).toHaveBeenCalledWith('psychologist-1')
  })
})
