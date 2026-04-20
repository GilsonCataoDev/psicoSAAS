export interface Patient {
  id: string
  name: string
  email?: string
  phone?: string
  birthDate?: string
  pronouns?: string
  tags: EmotionalTag[]
  status: 'active' | 'paused' | 'discharged'
  sessionPrice: number
  sessionDuration: number
  startDate: string
  notes?: string
  avatarColor: string
  createdAt: string
  updatedAt: string
}

export type EmotionalTag =
  | 'ansiedade'
  | 'depressao'
  | 'luto'
  | 'trauma'
  | 'relacionamento'
  | 'autoestima'
  | 'familia'
  | 'trabalho'
  | 'identidade'
  | 'progresso'
  | 'crise'
  | 'outro'

export interface Appointment {
  id: string
  patientId: string
  patient?: Patient
  date: string
  time: string
  duration: number
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  modality: 'presencial' | 'online'
  notes?: string
  sessionId?: string
  createdAt: string
}

export interface Session {
  id: string
  patientId: string
  patient?: Patient
  appointmentId?: string
  date: string
  duration: number
  mood?: 1 | 2 | 3 | 4 | 5
  summary?: string
  privateNotes?: string
  tags: EmotionalTag[]
  nextSteps?: string
  paymentStatus: 'paid' | 'pending' | 'waived'
  paymentId?: string
  createdAt: string
  updatedAt: string
}

export interface FinancialRecord {
  id: string
  patientId: string
  patient?: Patient
  sessionId?: string
  type: 'income' | 'expense'
  amount: number
  description: string
  status: 'paid' | 'pending' | 'overdue'
  dueDate?: string
  paidAt?: string
  method?: 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'transfer'
  receiptUrl?: string
  createdAt: string
}

export interface DashboardStats {
  sessionsThisWeek: number
  sessionsThisMonth: number
  activePatients: number
  pendingPayments: number
  pendingAmount: number
  monthRevenue: number
  nextAppointment?: Appointment
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export const TAG_LABELS: Record<EmotionalTag, string> = {
  ansiedade: 'Ansiedade',
  depressao: 'Depressão',
  luto: 'Luto',
  trauma: 'Trauma',
  relacionamento: 'Relacionamento',
  autoestima: 'Autoestima',
  familia: 'Família',
  trabalho: 'Trabalho',
  identidade: 'Identidade',
  progresso: 'Progresso',
  crise: 'Crise',
  outro: 'Outro',
}

export const TAG_COLORS: Record<EmotionalTag, string> = {
  ansiedade:     'bg-amber-100 text-amber-700',
  depressao:     'bg-blue-100 text-blue-700',
  luto:          'bg-purple-100 text-purple-700',
  trauma:        'bg-rose-100 text-rose-700',
  relacionamento:'bg-pink-100 text-pink-700',
  autoestima:    'bg-orange-100 text-orange-700',
  familia:       'bg-cyan-100 text-cyan-700',
  trabalho:      'bg-indigo-100 text-indigo-700',
  identidade:    'bg-violet-100 text-violet-700',
  progresso:     'bg-sage-100 text-sage-700',
  crise:         'bg-red-100 text-red-700',
  outro:         'bg-neutral-100 text-neutral-600',
}
