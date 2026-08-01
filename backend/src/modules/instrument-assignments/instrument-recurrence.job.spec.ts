import { InstrumentRecurrenceJob } from './instrument-recurrence.job'

describe('InstrumentRecurrenceJob', () => {
  function makeJob(schedules: any[], patient: any = { id: 'patient-1', psychologistId: 'psy-1', name: 'Paciente Teste' }) {
    const schedulesRepo = {
      find: jest.fn().mockResolvedValue(schedules),
      save: jest.fn(async (item: any) => item),
    }
    const patientsRepo = {
      findOne: jest.fn().mockResolvedValue(patient),
    }
    const assignmentsService = {
      createOccurrence: jest.fn().mockResolvedValue({ assignment: { id: 'assignment-new' } }),
      nextOccurrence: jest.fn((from: Date, recurrence: string) => {
        const next = new Date(from)
        if (recurrence === 'weekly') next.setDate(next.getDate() + 7)
        else if (recurrence === 'biweekly') next.setDate(next.getDate() + 14)
        else next.setMonth(next.getMonth() + 1)
        return next
      }),
    }
    const lock = { withLock: jest.fn(async (_key: number, fn: () => Promise<void>) => fn()) }

    const job = new InstrumentRecurrenceJob(
      schedulesRepo as any,
      patientsRepo as any,
      assignmentsService as any,
      lock as any,
    )

    return { job, schedulesRepo, patientsRepo, assignmentsService }
  }

  it('gera uma nova ocorrencia e avanca nextSendAt para recorrencias vencidas', async () => {
    const schedule = {
      id: 'sched-1',
      patientId: 'patient-1',
      psychologistId: 'psy-1',
      instrumentId: 'phq-9',
      title: 'PHQ-9',
      category: 'Humor',
      template: 'Pergunta 1:',
      sendWhatsApp: false,
      recurrence: 'weekly',
      nextSendAt: new Date('2026-07-20T09:00:00.000Z'),
      active: true,
    }
    const { job, schedulesRepo, assignmentsService } = makeJob([schedule])

    await job.run()

    expect(assignmentsService.createOccurrence).toHaveBeenCalledTimes(1)
    expect(schedulesRepo.save).toHaveBeenCalledTimes(1)
    const saved = schedulesRepo.save.mock.calls[0][0]
    expect(saved.lastAssignmentId).toBe('assignment-new')
    expect(saved.nextSendAt.toISOString()).toBe('2026-07-27T09:00:00.000Z')
  })

  it('desativa a recorrencia quando o paciente nao existe mais', async () => {
    const schedule = {
      id: 'sched-2',
      patientId: 'patient-removed',
      psychologistId: 'psy-1',
      recurrence: 'monthly',
      nextSendAt: new Date('2026-07-20T09:00:00.000Z'),
      active: true,
    }
    const { job, schedulesRepo, assignmentsService } = makeJob([schedule], null)

    await job.run()

    expect(assignmentsService.createOccurrence).not.toHaveBeenCalled()
    expect(schedulesRepo.save).toHaveBeenCalledTimes(1)
    expect(schedulesRepo.save.mock.calls[0][0].active).toBe(false)
  })

  it('nao falha o lote inteiro quando uma recorrencia da erro', async () => {
    const okSchedule = {
      id: 'sched-ok',
      patientId: 'patient-1',
      psychologistId: 'psy-1',
      recurrence: 'weekly',
      nextSendAt: new Date('2026-07-20T09:00:00.000Z'),
      active: true,
    }
    const badSchedule = { ...okSchedule, id: 'sched-bad', patientId: 'patient-bad' }
    const { job, assignmentsService, patientsRepo } = makeJob([badSchedule, okSchedule])
    patientsRepo.findOne
      .mockRejectedValueOnce(new Error('db explodiu'))
      .mockResolvedValueOnce({ id: 'patient-1', psychologistId: 'psy-1', name: 'Paciente Teste' })

    await expect(job.run()).resolves.toBeUndefined()
    expect(assignmentsService.createOccurrence).toHaveBeenCalledTimes(1)
  })
})
