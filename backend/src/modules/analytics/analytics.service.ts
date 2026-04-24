import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between, MoreThanOrEqual } from 'typeorm'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, format } from 'date-fns'
import { Patient } from '../patients/entities/patient.entity'
import { Appointment } from '../appointments/entities/appointment.entity'
import { FinancialRecord } from '../financial/entities/financial-record.entity'

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Patient)         private patients: Repository<Patient>,
    @InjectRepository(Appointment)     private appointments: Repository<Appointment>,
    @InjectRepository(FinancialRecord) private financial: Repository<FinancialRecord>,
  ) {}

  async getDashboardStats(userId: string) {
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd   = endOfMonth(now)
    const weekStart  = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd    = endOfWeek(now, { weekStartsOn: 1 })
    const today      = format(now, 'yyyy-MM-dd')

    // Paralelo para performance
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
      this.patients.count({ where: { psychologistId: userId, status: 'active' } }),

      this.appointments.count({
        where: {
          psychologistId: userId,
          status: 'completed' as any,
          scheduledAt: Between(monthStart, monthEnd),
        },
      }),

      this.appointments.count({
        where: {
          psychologistId: userId,
          status: 'completed' as any,
          scheduledAt: Between(weekStart, weekEnd),
        },
      }),

      this.appointments.find({
        where: { psychologistId: userId, date: today },
        relations: ['patient'],
        order: { time: 'ASC' },
      }),

      this.financial.find({
        where: { psychologistId: userId, paymentStatus: 'pending' as any, type: 'receita' as any },
        order: { dueDate: 'ASC' },
        take: 10,
      }),

      this.financial
        .createQueryBuilder('f')
        .select('SUM(f.amount)', 'total')
        .where('f.psychologistId = :userId', { userId })
        .andWhere('f.type = :type', { type: 'receita' })
        .andWhere('f.paymentStatus = :status', { status: 'paid' })
        .andWhere('f.paidAt BETWEEN :start AND :end', { start: monthStart, end: monthEnd })
        .getRawOne(),

      // Receita dos últimos 6 meses para o gráfico
      Promise.all(
        Array.from({ length: 6 }, (_, i) => {
          const d = subMonths(now, 5 - i)
          return this.financial
            .createQueryBuilder('f')
            .select('SUM(f.amount)', 'total')
            .where('f.psychologistId = :userId', { userId })
            .andWhere('f.type = :type', { type: 'receita' })
            .andWhere('f.paymentStatus = :status', { status: 'paid' })
            .andWhere('EXTRACT(YEAR FROM f.paidAt) = :year', { year: d.getFullYear() })
            .andWhere('EXTRACT(MONTH FROM f.paidAt) = :month', { month: d.getMonth() + 1 })
            .getRawOne()
            .then(r => ({ mes: format(d, 'MMM'), valor: Number(r?.total ?? 0) }))
        }),
      ),

      // Pacientes sem sessão nos últimos 30 dias (risco de churn)
      this.patients.count({
        where: {
          psychologistId: userId,
          status: 'active' as any,
          lastSessionAt: Between(new Date(0), subMonths(now, 1)),
        },
      }),
    ])

    const pendingAmount = pendingPayments.reduce((s, p) => s + Number(p.amount), 0)

    return {
      activePatients,
      sessionsThisMonth,
      sessionsThisWeek,
      monthRevenue: Number(monthRevenue?.total ?? 0),
      pendingPayments: pendingPayments.length,
      pendingAmount,
      inactivePatients,   // pacientes sem sessão há 30+ dias
      todayAppointments,
      revenueChart,
    }
  }
}
