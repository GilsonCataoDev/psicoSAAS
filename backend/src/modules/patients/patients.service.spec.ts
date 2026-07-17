import { PatientsService } from './patients.service'

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
      birthDate: '1990-05-10',
      tags: ['ansiedade'],
    }))
    expect(updated).toEqual(expect.objectContaining({
      name: 'Nome atualizado',
      email: null,
      phone: null,
    }))
  })
})
