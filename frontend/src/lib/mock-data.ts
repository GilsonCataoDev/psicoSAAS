import { Patient, Appointment, Session, FinancialRecord, DashboardStats } from '@/types'

export const mockPatients: Patient[] = []
export const mockAppointments: Appointment[] = []
export const mockSessions: Session[] = []
export const mockFinancial: FinancialRecord[] = []

export const mockDashboard: DashboardStats = {
  sessionsThisWeek: 0,
  sessionsThisMonth: 0,
  activePatients: 0,
  pendingPayments: 0,
  pendingAmount: 0,
  monthRevenue: 0,
}
