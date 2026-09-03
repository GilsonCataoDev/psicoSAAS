import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThanOrEqual, Repository } from 'typeorm'
import { InstrumentSchedule } from './entities/instrument-schedule.entity'
import { Patient } from '../patients/entities/patient.entity'
import { InstrumentAssignmentsService } from './instrument-assignments.service'
import { AdvisoryLockService, JOB_LOCK_KEYS } from '../../common/advisory-lock/advisory-lock.service'

const ONE_HOUR_MS = 60 * 60 * 1000

// Gera a proxima ocorrencia (InstrumentAssignment) de cada recorrencia ativa
// cujo nextSendAt ja passou — o psicologo configura a regra uma vez em
// InstrumentSchedule e este job cuida dos envios seguintes sozinho.
@Injectable()
export class InstrumentRecurrenceJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InstrumentRecurrenceJob.name)
  private timer?: NodeJS.Timeout
  private running = false

  constructor(
    @InjectRepository(InstrumentSchedule)
    private readonly schedules: Repository<InstrumentSchedule>,
    @InjectRepository(Patient)
    private readonly patients: Repository<Patient>,
    private readonly assignments: InstrumentAssignmentsService,
    private readonly lock: AdvisoryLockService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => this.run().catch((err) => this.logger.error(err)), ONE_HOUR_MS)
    setTimeout(() => this.run().catch((err) => this.logger.error(err)), 10_000)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  async run(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      await this.lock.withLock(JOB_LOCK_KEYS.INSTRUMENT_RECURRENCE, () => this.runLocked())
    } finally {
      this.running = false
    }
  }

  private async runLocked(): Promise<void> {
    const due = await this.schedules.find({
      where: { active: true, nextSendAt: LessThanOrEqual(new Date()) },
    })
    if (!due.length) return

    let sent = 0
    for (const schedule of due) {
      try {
        const patient = await this.patients.findOne({
          where: { id: schedule.patientId, psychologistId: schedule.psychologistId },
        })
        if (!patient) {
          // Paciente removido/transferido — nao ha o que enviar; desativa a recorrencia orfa.
          schedule.active = false
          await this.schedules.save(schedule)
          continue
        }

        const { assignment } = await this.assignments.createOccurrence(
          {
            instrumentId: schedule.instrumentId,
            title: schedule.title,
            description: schedule.description,
            category: schedule.category,
            template: schedule.template,
            sendWhatsApp: schedule.sendWhatsApp,
          },
          patient,
          schedule.psychologistId,
        )

        schedule.lastAssignmentId = assignment.id
        schedule.nextSendAt = this.assignments.nextOccurrence(schedule.nextSendAt, schedule.recurrence)
        await this.schedules.save(schedule)
        sent += 1
      } catch (error) {
        this.logger.warn(`Falha ao gerar ocorrencia recorrente schedule=${schedule.id}: ${error instanceof Error ? error.message : error}`)
      }
    }

    if (sent > 0) {
      this.logger.log(`Recorrencias de instrumentos processadas: ${sent}`)
    }
  }
}
