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
  it('remove definitivamente o paciente do proprio psicologo, junto com documentos e anexos', async () => {
    const patient = { id: 'patient-1', psychologistId: 'psychologist-1' }
    const repo = {
      findOne: jest.fn().mockResolvedValue(patient),
      remove: jest.fn().mockResolvedValue(patient),
    }
    const documents = { delete: jest.fn().mockResolvedValue(undefined) }
    const attachments = {
      list: jest.fn().mockResolvedValue([{ id: 'att-1' }, { id: 'att-2' }]),
      remove: jest.fn().mockResolvedValue({ ok: true }),
    }
    const service = new PatientsService(repo as any, {} as any, documents as any, {} as any, {} as any, attachments as any)

    await service.remove(patient.id, patient.psychologistId)

    expect(documents.delete).toHaveBeenCalledWith({ patientId: patient.id, userId: patient.psychologistId })
    expect(attachments.list).toHaveBeenCalledWith(patient.id, patient.psychologistId)
    expect(attachments.remove).toHaveBeenCalledWith('att-1', patient.id, patient.psychologistId)
    expect(attachments.remove).toHaveBeenCalledWith('att-2', patient.id, patient.psychologistId)
    expect(repo.remove).toHaveBeenCalledWith(patient)
  })

  it('usa sempre a assinatura mais recente para calcular o limite', async () => {
    const repo = { count: jest.fn().mockResolvedValue(8) }
    const planAccess = { getCurrentPlan: jest.fn().mockResolvedValue('free') }
    const service = new PatientsService(
      repo as any,
      {} as any,
      {} as any,
      {} as any,
      planAccess as any,
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
