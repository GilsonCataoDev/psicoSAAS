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
      {} as any,
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
  it('remove definitivamente o paciente do proprio psicologo, em transacao, junto com documentos e storage dos anexos', async () => {
    const patient = { id: 'patient-1', psychologistId: 'psychologist-1' }
    const repo = {
      findOne: jest.fn().mockResolvedValue(patient),
    }
    const patientAttachments = {
      find: jest.fn().mockResolvedValue([{ storageKey: 'key-1' }, { storageKey: 'key-2' }, { storageKey: null }]),
    }
    const manager = {
      delete: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(patient),
    }
    const dataSource = {
      transaction: jest.fn(async (cb: any) => cb(manager)),
    }
    const storage = { delete: jest.fn().mockResolvedValue(undefined) }
    const service = new PatientsService(
      repo as any,
      {} as any,
      {} as any,
      patientAttachments as any,
      {} as any,
      {} as any,
      storage as any,
      dataSource as any,
    )

    const result = await service.remove(patient.id, patient.psychologistId)

    expect(patientAttachments.find).toHaveBeenCalledWith({
      where: { patientId: patient.id, psychologistId: patient.psychologistId },
      select: ['storageKey'],
    })
    expect(dataSource.transaction).toHaveBeenCalled()
    expect(manager.delete).toHaveBeenCalledWith(expect.anything(), { patientId: patient.id, userId: patient.psychologistId })
    expect(manager.remove).toHaveBeenCalledWith(patient)
    expect(storage.delete).toHaveBeenCalledWith('key-1')
    expect(storage.delete).toHaveBeenCalledWith('key-2')
    expect(storage.delete).toHaveBeenCalledTimes(2)
    expect(result).toBe(patient)
  })

  it('usa sempre a assinatura mais recente para calcular o limite', async () => {
    const repo = { count: jest.fn().mockResolvedValue(8) }
    const planAccess = { getCurrentPlan: jest.fn().mockResolvedValue('free') }
    const service = new PatientsService(
      repo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      planAccess as any,
      {} as any,
      {} as any,
    )

    await expect(service.getPlanUsage('psychologist-1')).resolves.toEqual({
      plan: 'free',
      limit: 10,
      count: 8,
    })
    expect(planAccess.getCurrentPlan).toHaveBeenCalledWith('psychologist-1')
  })
})
