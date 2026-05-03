import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, format } from 'date-fns'
import { Patient } from '../patients/entities/patient.entity'
import { Appointment } from '../appointments/entities/appointment.entity'
import { FinancialRecord } from '../financial/entities/financial-record.entity'

const PT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

/** Helper: executa a query e retorna fallback em caso de erro, logando o problema */
async function safe<T>(label: string, logger: Logger, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err: any) {
    logger.error(`[dashboard] query "${label}" falhou: ${err?.message ?? err}`)
    return fallback
  }
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name)

  constructor(
    @InjectRepository(Patient)         private patients: Repository<Patient>,
    @InjectRepository(Appointment)     private appointments: Repository<Appointment>,
    @InjectRepository(FinancialRecord) private financial: Repository<FinancialRecord>,
  ) {}

  async getDashboardStats(userId: string) {
    this.logger.log(`getDashboardStats userId=${userId}`)

    const now        = new Date()
    const today      = format(now, 'yyyy-MM-dd')
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
    const monthEnd   = format(endOfMonth(now), 'yyyy-MM-dd')
    const weekStart  = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEnd    = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const thirtyDaysAgo = format(subMonths(now, 1), 'yyyy-MM-dd')
    const log = this.logger

    const [
      activePatients,
      sessionsThisMonth,
      sessionsThisWeek,
      todayAppointments,
      pendingPayments,
      monthRevenue,
      revenueChart,
      inactivePatients,
    ] = await Promise.all([

      // ── Pacientes ativos ────────────────────────────────────────────────────
      // OR IS NULL: trata status=NULL (legado) como ativo no PostgreSQL
      safe('activePatients', log, () =>
        this.patients
          .createQueryBuilder('p')
          .where('p.psychologistId = :userId', { userId })
          .andWhere("(p.status IS NULL OR p.status NOT IN ('paused', 'discharged'))")
          .getCount(),
        0,
      ),

      // ── Sessões do mês ──────────────────────────────────────────────────────
      safe('sessionsThisMonth', log, () =>
        this.appointments
          .createQueryBuilder('a')
          .where('a.psychologistId = :userId', { userId })
          .andWhere('a.status = :status', { status: 'completed' })
          .andWhere('a.date BETWEEN :start AND :end', { start: monthStart, end: monthEnd })
          .getCount(),
        0,
      ),

      // ── Sessões da semana ───────────────────────────────────────────────────
      safe('sessionsThisWeek', log, () =>
        this.appointments
          .createQueryBuilder('a')
          .where('a.psychologistId = :userId', { userId })
          .andWhere('a.status = :status', { status: 'completed' })
          .andWhere('a.date BETWEEN :start AND :end', { start: weekStart, end: weekEnd })
          .getCount(),
        0,
      ),

      // ── Agenda de hoje ──────────────────────────────────────────────────────
      safe('todayAppointments', log, () =>
        this.appointments.find({
          where: { psychologistId: userId, date: today },
          relations: ['patient'],
          order: { time: 'ASC' },
        }),
        [],
      ),

      // ── Pagamentos pendentes ────────────────────────────────────────────────
      safe('pendingPayments', log, () =>
        this.financial
          .createQueryBuilder('f')
          .where('f.psychologistId = :userId', { userId })
          .andWhere('f.status IN (:...statuses)', { statuses: ['pending', 'overdue'] })
          .andWhere("(f.type IS NULL OR f.type = 'income')")
          .orderBy('f.dueDate', 'ASC', 'NULLS LAST')
          .take(10)
          .getMany(),
        [],
      ),

      // ── Receita do mês ──────────────────────────────────────────────────────
      safe('monthRevenue', log, () =>
        this.financial
          .createQueryBuilder('f')
          .select('SUM(f.amount)', 'total')
          .where('f.psychologistId = :userId', { userId })
          .andWhere('f.type = :type', { type: 'income' })
          .andWhere('f.status = :status', { status: 'paid' })
          .andWhere('f.paidAt BETWEEN :start AND :end', { start: monthStart, end: monthEnd })
          .getRawOne(),
        null,
      ),

      // ── Gráfico de receita (últimos 6 meses) ────────────────────────────────
      safe('revenueChart', log, () =>
        Promise.all(
          Array.from({ length: 6 }, (_, i) => {
            const d      = subMonths(now, 5 - i)
            const mStart = format(startOfMonth(d), 'yyyy-MM-dd')
            const mEnd   = format(endOfMonth(d), 'yyyy-MM-dd')
            const label  = PT_MONTHS[d.getMonth()]
            return this.financial
              .createQueryBuilder('f')
              .select('SUM(f.amount)', 'total')
              .where('f.psychologistId = :userId', { userId })
              .andWhere('f.type = :type', { type: 'income' })
              .andWhere('f.status = :status', { status: 'paid' })
              .andWhere('f.paidAt BETWEEN :start AND :end', { start: mStart, end: mEnd })
              .getRawOne()
              .then(r => ({ mes: label, valor: Number(r?.total ?? 0) }))
          }),
        ),
        [],
      ),

      // ── Pacientes inativos (sem sessão há 30 dias) ──────────────────────────
      safe('inactivePatients', log, () =>
        this.patients
          .createQueryBuilder('p')
          .where('p.psychologistId = :userId', { userId })
          .andWhere("(p.status IS NULL OR p.status NOT IN ('paused', 'discharged'))")
          .andWhere(`COALESCE((
            SELECT MAX(a.date) FROM appointments a
            WHERE a."patientId" = p.id AND a.status = 'completed'
          ), '1970-01-01') < :thirtyDaysAgo`, { thirtyDaysAgo })
          .getCount(),
        0,
      ),
    ])

    this.logger.log(
      `dashboard OK: active=${activePatients} sessMonth=${sessionsThisMonth} pending=${(pendingPayments as any[]).length}`,
    )

    return {
      activePatients,
      sessionsThisMonth,
      sessionsThisWeek,
      monthRevenue: Number((monthRevenue as any)?.total ?? 0),
      pendingPayments: (pendingPayments as any[]).length,
      pendingAmount: (pendingPayments as any[]).reduce((s: number, p: any) => s + Number(p.amount), 0),
      inactivePatients,
      todayAppointments,
      revenueChart,
    }
  }
}
