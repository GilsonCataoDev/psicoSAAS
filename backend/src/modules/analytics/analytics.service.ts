import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Not, In } from 'typeorm'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, format } from 'date-fns'
import { Patient } from '../patients/entities/patient.entity'
import { Appointment } from '../appointments/entities/appointment.entity'
import { FinancialRecord } from '../financial/entities/financial-record.entity'

const PT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Patient)         private patients: Repository<Patient>,
    @InjectRepository(Appointment)     private appointments: Repository<Appointment>,
    @InjectRepository(FinancialRecord) private financial: Repository<FinancialRecord>,
  ) {}

  async getDashboardStats(userId: string) {
    const now       = new Date()
    const today     = format(now, 'yyyy-MM-dd')
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
    const monthEnd   = format(endOfMonth(now), 'yyyy-MM-dd')
    const weekStart  = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEnd    = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const thirtyDaysAgo = format(subMonths(now, 1), 'yyyy-MM-dd')

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

      // Conta ativos: exclui pausados/desligados, mas inclui NULL (pacientes legados sem status)
      this.patients.count({ where: { psychologistId: userId, status: Not(In(['paused', 'discharged'])) } }),

      this.appointments
        .createQueryBuilder('a')
        .where('a.psychologistId = :userId', { userId })
        .andWhere('a.status = :status', { status: 'completed' })
        .andWhere('a.date BETWEEN :start AND :end', { start: monthStart, end: monthEnd })
        .getCount(),

      this.appointments
        .createQueryBuilder('a')
        .where('a.psychologistId = :userId', { userId })
        .andWhere('a.status = :status', { status: 'completed' })
        .andWhere('a.date BETWEEN :start AND :end', { start: weekStart, end: weekEnd })
        .getCount(),

      this.appointments.find({
        where: { psychologistId: userId, date: today },
        relations: ['patient'],
        order: { time: 'ASC' },
      }),

      this.financial.find({
        where: { psychologistId: userId, status: 'pending', type: 'income' },
        order: { dueDate: 'ASC' },
        take: 10,
      }),

      this.financial
        .createQueryBuilder('f')
        .select('SUM(f.amount)', 'total')
        .where('f.psychologistId = :userId', { userId })
        .andWhere('f.type = :type', { type: 'income' })
        .andWhere('f.status = :status', { status: 'paid' })
        .andWhere('f.paidAt BETWEEN :start AND :end', { start: monthStart, end: monthEnd })
        .getRawOne(),

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

      // Pacientes ativos (inclui NULL legado) sem sessão completada nos últimos 30 dias
      this.patients
        .createQueryBuilder('p')
        .where('p.psychologistId = :userId', { userId })
        .andWhere("(p.status NOT IN ('paused', 'discharged') OR p.status IS NULL)")
        .andWhere(`COALESCE((
          SELECT MAX(a.date) FROM appointments a
          WHERE a."patientId" = p.id AND a.status = 'completed'
        ), '1970-01-01') < :thirtyDaysAgo`, { thirtyDaysAgo })
        .getCount(),
    ])

    return {
      activePatients,
      sessionsThisMonth,
      sessionsThisWeek,
      monthRevenue: Number(monthRevenue?.total ?? 0),
      pendingPayments: pendingPayments.length,
      pendingAmount: pendingPayments.reduce((s, p) => s + Number(p.amount), 0),
      inactivePatients,
      todayAppointments,
      revenueChart,
    }
  }
}
