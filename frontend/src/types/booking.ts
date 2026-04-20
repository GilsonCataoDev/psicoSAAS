export interface BookingPage {
  id: string
  slug: string
  isActive: boolean
  title?: string
  description?: string
  psychologistName: string
  psychologistCrp: string
  specialty?: string
  sessionPrice: number
  sessionDuration: number
  slotInterval: number
  allowPresencial: boolean
  allowOnline: boolean
  minAdvanceDays: number
  maxAdvanceDays: number
  requirePaymentUpfront: boolean
  pixKey?: string
  confirmationMessage?: string
}

export interface Booking {
  id: string
  patientName: string
  patientEmail: string
  patientPhone?: string
  date: string
  time: string
  duration: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  paymentStatus: 'pending' | 'paid' | 'waived' | 'refunded'
  amount: number
  paymentMethod?: string
  paidAt?: string
  patientNotes?: string
  createdAt: string
}

export interface AvailabilitySlot {
  id?: string
  weekday: number
  startTime: string
  endTime: string
}

export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const WEEKDAY_FULL   = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
