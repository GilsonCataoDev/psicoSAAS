import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, format } from 'date-fns'
import { Patient } from '../patients/entities/patient.entity'
import { Appointment } from '../appointments/entities/appointment.entity'
import { FinancialRecord } from '../financial/entities/financial-record.entity'
import { Booking } from '../booking/entities/booking.entity'
import { Session } from '../sessions/entities/session.entity'

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
    @InjectRepository(Booking)         private bookings: Repository<Booking>,
    @InjectRepository(Session)         private sessions: Repository<Session>,
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
      completedSessionsThisMonth,
      sessionsThisWeek,
      todayAppointments,
      pendingPaymentsSummary,
      pendingPaymentsDetail,
      monthRevenue,
      revenueChart,
      inactivePatients,
      remindersSent,
      earlyCancellations,
      monthAppointments,
      noShowsThisMonth,
      cancelledThisMonth,
      onlineThisMonth,
      registeredSessions,
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
          .andWhere('a.status IN (:...statuses)', { statuses: ['scheduled', 'completed', 'no_show'] })
          .andWhere('a.date BETWEEN :start AND :end', { start: monthStart, end: monthEnd })
          .getCount(),
        0,
      ),

      safe('completedSessionsThisMonth', log, () =>
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
      safe('pendingPaymentsSummary', log, () =>
        this.financial
          .createQueryBuilder('f')
          .select('COUNT(*)', 'count')
          .addSelect('COALESCE(SUM(f.amount), 0)', 'amount')
          .where('f.psychologistId = :userId', { userId })
          .andWhere('f.status IN (:...statuses)', { statuses: ['pending', 'overdue'] })
          .andWhere("(f.type IS NULL OR f.type = 'income')")
          .andWhere('f.amount > 0')
          .getRawOne(),
        { count: 0, amount: 0 },
      ),

      safe('pendingPaymentsDetail', log, () =>
        this.financial
          .createQueryBuilder('f')
          .where('f.psychologistId = :userId', { userId })
          .andWhere('f.status IN (:...statuses)', { statuses: ['pending', 'overdue'] })
          .andWhere("(f.type IS NULL OR f.type = 'income')")
          .andWhere('f.amount > 0')
          .orderBy('f.dueDate', 'ASC', 'NULLS LAST')
          .take(10)
          .getMany(),
        [],
      ),

      // ── Receita do mês ──────────────────────────────────────────────────────
      // paidAt é armazenado como ISO datetime (ex: '2026-07-31T23:00:00.000Z').
      // BETWEEN com string de data ('2026-07-31') excluiria pagamentos do último dia
      // pois '2026-07-31T...' > '2026-07-31' lexicograficamente.
      // Usar >= start e < início do próximo mês garante cobertura total.
      safe('monthRevenue', log, () =>
        this.financial
          .createQueryBuilder('f')
          .select('SUM(f.amount)', 'total')
          .where('f.psychologistId = :userId', { userId })
          .andWhere('f.type = :type', { type: 'income' })
          .andWhere('f.status = :status', { status: 'paid' })
          .andWhere('f.paidAt >= :start AND f.paidAt < :nextStart', {
            start: monthStart,
            nextStart: format(startOfMonth(subMonths(now, -1)), 'yyyy-MM-dd'),
          })
          .getRawOne(),
        null,
      ),

      // ── Gráfico de receita (últimos 6 meses) ────────────────────────────────
      safe('revenueChart', log, () =>
        Promise.all(
          Array.from({ length: 6 }, (_, i) => {
            const d          = subMonths(now, 5 - i)
            const mStart     = format(startOfMonth(d), 'yyyy-MM-dd')
            const mNextStart = format(startOfMonth(subMonths(d, -1)), 'yyyy-MM-dd')
            const label      = PT_MONTHS[d.getMonth()]
            return this.financial
              .createQueryBuilder('f')
              .select('SUM(f.amount)', 'total')
              .where('f.psychologistId = :userId', { userId })
              .andWhere('f.type = :type', { type: 'income' })
              .andWhere('f.status = :status', { status: 'paid' })
              .andWhere('f.paidAt >= :start AND f.paidAt < :nextStart', { start: mStart, nextStart: mNextStart })
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
          .andWhere(`(
            SELECT MAX(a.date) FROM appointments a
            WHERE a."patientId" = p.id AND a.status = 'completed'
          ) IS NOT NULL`)
          .andWhere(`(
            SELECT MAX(a.date) FROM appointments a
            WHERE a."patientId" = p.id AND a.status = 'completed'
          ) < :thirtyDaysAgo`, { thirtyDaysAgo })
          .getCount(),
        0,
      ),

      safe('remindersSent', log, () =>
        this.appointments
          .createQueryBuilder('a')
          .where('a.psychologistId = :userId', { userId })
          .andWhere(`(
            a."reminder24hSentAt" BETWEEN :start AND :end
            OR a."reminder2hSentAt" BETWEEN :start AND :end
          )`, { start: monthStart, end: monthEnd })
          .getCount(),
        0,
      ),

      safe('absences', log, () =>
        Promise.all([
          // Cancelamentos ainda sem consulta interna vinculada.
          this.bookings
            .createQueryBuilder('b')
            .select('COUNT(*)', 'count')
            .addSelect('COALESCE(SUM(b.amount), 0)', 'amount')
            .where('b.psychologistId = :userId', { userId })
            .andWhere('b.status = :status', { status: 'cancelled' })
            .andWhere('b.appointmentId IS NULL')
            .andWhere('b.cancelledAt BETWEEN :start AND :end', { start: monthStart, end: monthEnd })
            .getRawOne(),
          // Consultas da agenda marcadas como canceladas ou falta, valorizadas pelo preço do paciente.
          this.appointments
            .createQueryBuilder('a')
            .leftJoin('a.patient', 'p')
            .select('COUNT(*)', 'count')
            .addSelect('COALESCE(SUM(p.sessionPrice), 0)', 'amount')
            .where('a.psychologistId = :userId', { userId })
            .andWhere('a.status IN (:...statuses)', { statuses: ['cancelled', 'no_show'] })
            .andWhere('a.date BETWEEN :start AND :end', { start: monthStart, end: monthEnd })
            .getRawOne(),
        ]).then(([publicCancellations, appointmentAbsences]) => ({
          count: Number(publicCancellations?.count ?? 0) + Number(appointmentAbsences?.count ?? 0),
          amount: Number(publicCancellations?.amount ?? 0) + Number(appointmentAbsences?.amount ?? 0),
        })),
        { count: 0, amount: 0 },
      ),

      safe('monthAppointments', log, () =>
        this.appointments
          .createQueryBuilder('a')
          .where('a.psychologistId = :userId', { userId })
          .andWhere('a.date BETWEEN :start AND :end', { start: monthStart, end: monthEnd })
          .getCount(),
        0,
      ),

      safe('noShowsThisMonth', log, () =>
        this.appointments
          .createQueryBuilder('a')
          .where('a.psychologistId = :userId', { userId })
          .andWhere('a.status = :status', { status: 'no_show' })
          .andWhere('a.date BETWEEN :start AND :end', { start: monthStart, end: monthEnd })
          .getCount(),
        0,
      ),

      safe('cancelledThisMonth', log, () =>
        this.appointments
          .createQueryBuilder('a')
          .where('a.psychologistId = :userId', { userId })
          .andWhere('a.status = :status', { status: 'cancelled' })
          .andWhere('a.date BETWEEN :start AND :end', { start: monthStart, end: monthEnd })
          .getCount(),
        0,
      ),

      safe('onlineThisMonth', log, () =>
        this.appointments
          .createQueryBuilder('a')
          .where('a.psychologistId = :userId', { userId })
          .andWhere('a.modality = :modality', { modality: 'online' })
          .andWhere('a.status IN (:...statuses)', { statuses: ['scheduled', 'completed', 'no_show'] })
          .andWhere('a.date BETWEEN :start AND :end', { start: monthStart, end: monthEnd })
          .getCount(),
        0,
      ),

      safe('registeredSessions', log, () =>
        this.sessions
          .createQueryBuilder('s')
          .where('s.psychologistId = :userId', { userId })
          .getCount(),
        0,
      ),
    ])

    const unlinkedSessionsThisMonth = await safe('unlinkedSessionsThisMonth', log, () =>
      this.sessions
        .createQueryBuilder('s')
        .where('s.psychologistId = :userId', { userId })
        .andWhere('s.appointmentId IS NULL')
        .andWhere('s.date BETWEEN :start AND :end', { start: monthStart, end: monthEnd })
        .getCount(),
      0,
    )

    const reminderCount = Number(remindersSent ?? 0)
    const absenceCount = Number((earlyCancellations as any)?.count ?? 0)
    const absencesAmount = Number((earlyCancellations as any)?.amount ?? 0)
    const standaloneSessionCount = Number(unlinkedSessionsThisMonth ?? 0)
    const totalMonthAppointments = Number(monthAppointments ?? 0) + standaloneSessionCount
    const scheduledMonthAppointments = Number(sessionsThisMonth ?? 0) + standaloneSessionCount
    const completedMonthAppointments = Number(completedSessionsThisMonth ?? 0) + standaloneSessionCount
    const noShowCount = Number(noShowsThisMonth ?? 0)
    const cancelledCount = Number(cancelledThisMonth ?? 0)
    const onlineCount = Number(onlineThisMonth ?? 0)
    const activePatientCount = Number(activePatients ?? 0)
    const attendanceBase = completedMonthAppointments + noShowCount
    const pendingPaymentCount = Number((pendingPaymentsSummary as any)?.count ?? 0)
    const pendingPaymentAmount = Number((pendingPaymentsSummary as any)?.amount ?? 0)

    this.logger.log(
      `dashboard OK: active=${activePatients} sessMonth=${sessionsThisMonth} pending=${pendingPaymentCount}`,
    )

    return {
      activePatients,
      sessionsThisMonth: scheduledMonthAppointments,
      completedSessionsThisMonth: completedMonthAppointments,
      sessionsThisWeek,
      registeredSessions,
      monthRevenue: Number((monthRevenue as any)?.total ?? 0),
      pendingPayments: pendingPaymentCount,
      pendingAmount: pendingPaymentAmount,
      pendingPaymentsDetail,
      inactivePatients,
      todayAppointments,
      revenueChart,
      clinicIndicators: {
        totalAppointments: totalMonthAppointments,
        completedAppointments: completedMonthAppointments,
        noShows: noShowCount,
        cancelled: cancelledCount,
        onlineAppointments: onlineCount,
        scheduledAppointments: scheduledMonthAppointments,
        attendanceRate: attendanceBase > 0 ? Math.round((completedMonthAppointments / attendanceBase) * 100) : 0,
        noShowRate: attendanceBase > 0 ? Math.round((noShowCount / attendanceBase) * 100) : 0,
        onlineRate: scheduledMonthAppointments > 0 ? Math.round((onlineCount / scheduledMonthAppointments) * 100) : 0,
        avgSessionsPerActivePatient: activePatientCount > 0
          ? Math.round((completedMonthAppointments / activePatientCount) * 10) / 10
          : 0,
      },
      roi: {
        remindersSent: reminderCount,
        absencesCount: absenceCount,
        earlyCancellations: absenceCount, // Compatibilidade com clientes anteriores.
        absencesAmount,
        estimatedMinutesSaved: reminderCount * 2,
      },
    }
  }
}
