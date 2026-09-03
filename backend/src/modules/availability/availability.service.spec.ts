import { BadRequestException } from '@nestjs/common'
import { AvailabilityService } from './availability.service'

describe('AvailabilityService weekly blocking', () => {
  const blocked = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    delete: jest.fn(),
  }
  const blocks = {
    find: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    delete: jest.fn(),
  }

  const service = new AvailabilityService(
    {} as any,
    blocked as any,
    {} as any,
    blocks as any,
    {} as any,
    {} as any,
  )

  beforeEach(() => jest.clearAllMocks())

  it('bloqueia de segunda a domingo a partir de qualquer data escolhida', async () => {
    blocked.find.mockResolvedValue([])

    const result = await service.addBlockedWeek('psi-1', '2026-07-23', 'Ferias')

    expect(result).toEqual({
      dates: [
        '2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23',
        '2026-07-24', '2026-07-25', '2026-07-26',
      ],
      created: 7,
    })
    expect(blocked.save).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ psychologistId: 'psi-1', date: '2026-07-20', reason: 'Ferias' }),
      expect.objectContaining({ psychologistId: 'psi-1', date: '2026-07-26', reason: 'Ferias' }),
    ]))
  })

  it('nao duplica dias que ja estavam bloqueados', async () => {
    blocked.find.mockResolvedValue([{ date: '2026-07-20' }, { date: '2026-07-23' }])

    const result = await service.addBlockedWeek('psi-1', '2026-07-20')

    expect(result.created).toBe(5)
    const saved = blocked.save.mock.calls[0][0]
    expect(saved).toHaveLength(5)
    expect(saved).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ date: '2026-07-20' }),
      expect.objectContaining({ date: '2026-07-23' }),
    ]))
  })

  it('trata corretamente uma semana na virada do mes e do ano', async () => {
    blocked.find.mockResolvedValue([])

    const result = await service.addBlockedWeek('psi-1', '2027-01-01')

    expect(result.dates).toEqual([
      '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31',
      '2027-01-01', '2027-01-02', '2027-01-03',
    ])
  })

  it('rejeita uma data inexistente', async () => {
    await expect(service.addBlockedWeek('psi-1', '2026-02-31')).rejects.toBeInstanceOf(BadRequestException)
    expect(blocked.save).not.toHaveBeenCalled()
  })

  it('cria bloqueio semanal de horario', async () => {
    blocks.find.mockResolvedValue([])

    const result = await service.addAvailabilityBlock('psi-1', {
      type: 'weekly',
      weekday: 1,
      startTime: '12:00',
      endTime: '13:00',
      reason: 'Almoco',
    })

    expect(result).toEqual(expect.objectContaining({
      psychologistId: 'psi-1',
      type: 'weekly',
      weekday: 1,
      date: null,
      startTime: '12:00',
      endTime: '13:00',
      reason: 'Almoco',
    }))
  })

  it('rejeita bloqueio de horario conflitante', async () => {
    blocks.find.mockResolvedValue([{ startTime: '12:00', endTime: '13:00' }])

    await expect(service.addAvailabilityBlock('psi-1', {
      type: 'weekly',
      weekday: 1,
      startTime: '12:30',
      endTime: '13:30',
    })).rejects.toBeInstanceOf(BadRequestException)
  })
})
