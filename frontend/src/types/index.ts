export interface Patient {
  id: string
  name: string
  email?: string
  phone?: string
  birthDate?: string
  pronouns?: string
  race?: string
  gender?: string
  sexualOrientation?: string
  cpfCnpj?: string
  tags: EmotionalTag[]
  status: 'active' | 'paused' | 'discharged'
  careMode: 'psychotherapy' | 'neuropsychological_assessment'
  sessionPrice: number
  billingType: 'per_session' | 'monthly_package'
  monthlyPackagePrice: number
  monthlyIncludedSessions: number
  billingDay: number
  sessionDuration: number
  startDate: string
  hasFixedSchedule?: boolean
  fixedScheduleWeekday?: number
  fixedScheduleTime?: string
  fixedScheduleFrequency?: 'weekly' | 'biweekly'
  fixedScheduleModality?: 'presencial' | 'online'
  notes?: string
  privateNotes?: string
  prontuario?: Record<string, any>
  avatarColor: string
  createdAt: string
  updatedAt: string
}

export type NeuropsychDomain =
  | 'intelligence'
  | 'attention'
  | 'memory'
  | 'executive_functions'
  | 'language'
  | 'visuospatial_skills'
  | 'behavioral_scales'
  | 'personality'

export interface NeuropsychBatteryItem {
  id: string
  assessmentId: string
  name: string
  procedureType: 'psychological_test' | 'neuropsychological_procedure' | 'behavioral_scale' | 'clinical_interview' | 'observation' | 'other'
  domains: NeuropsychDomain[]
  status: 'planned' | 'applied' | 'integrated' | 'not_applied'
  instrumentAssignmentId?: string
  purpose?: string
  resultSummary?: string
  qualitativeNotes?: string
  plannedDate?: string
  appliedDate?: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type NeuropsychAiCertainty = 'registered_data' | 'cautious_inference' | 'missing_information'

export interface NeuropsychAiClinicalPoint {
  text: string
  basis: string[]
  certainty: NeuropsychAiCertainty
}

export interface NeuropsychAiAnalysisResult {
  caseSynthesis: NeuropsychAiClinicalPoint[]
  convergences: NeuropsychAiClinicalPoint[]
  divergences: NeuropsychAiClinicalPoint[]
  possiblyPreservedFunctions: NeuropsychAiClinicalPoint[]
  possibleFragilities: NeuropsychAiClinicalPoint[]
  alternativeHypotheses: NeuropsychAiClinicalPoint[]
  missingInformation: string[]
  followUpQuestions: string[]
  verificationPoints: string[]
  suggestedIntegrationStructure: string[]
  disclaimers: string[]
}

export type NeuropsychAiAnalysisField = 'referralQuestion' | 'clinicalHistory' | 'clinicalHypotheses' | 'qualitativeObservations' | 'batteryItems'

export interface NeuropsychAiAnalysis {
  id: string
  status: string
  result: NeuropsychAiAnalysisResult
  model: string
  promptVersion: string
  inputTokens: number
  outputTokens: number
  costUsdMicros: number
  includedFields: NeuropsychAiAnalysisField[]
  createdAt: string
}

export interface NeuropsychAiUsage {
  used: number
  limit: number
  month: string
}

export interface NeuropsychAssessment {
  id: string
  patientId: string
  patient?: Pick<Patient, 'id' | 'name' | 'avatarColor'>
  status: 'planning' | 'in_progress' | 'integration' | 'completed' | 'archived'
  referralQuestion?: string
  clinicalHistory?: string
  clinicalHypotheses?: string
  evaluatedDomains: NeuropsychDomain[]
  qualitativeObservations?: string
  integrationDraft?: string
  professionalConclusion?: string
  startedAt: string
  targetCompletionDate?: string
  completedAt?: string
  version: number
  batteryItems: NeuropsychBatteryItem[]
  batteryProgress: { total: number; applied: number }
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
  | 'falta'

export interface Appointment {
  id: string
  patientId: string
  patient?: Patient
  date: string
  time: string
  duration: number
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  modality: 'presencial' | 'online'
  meetingUrl?: string
  autoVideoRoom?: boolean
  notes?: string
  isRecurring?: boolean
  recurringFrequency?: 'weekly' | 'biweekly'
  recurringGroupId?: string
  isFixedScheduleException?: boolean
  originalDate?: string
  originalTime?: string
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
  paymentStatus: 'paid' | 'pending' | 'waived' | 'included'
  paymentId?: string
  contentHash?: string
  lastEditedAt?: string
  addendaList?: SessionAddendum[]
  createdAt: string
  updatedAt: string
}

export interface SessionAddendum {
  text: string
  createdAt: string
}

export interface SessionRevision {
  id: string
  summary?: string
  privateNotes?: string
  nextSteps?: string
  editedAt: string
}

export interface NoteSnippet {
  id: string
  label: string
  content: string
  createdAt: string
}

export interface FinancialRecord {
  id: string
  patientId: string
  patient?: Patient
  sessionId?: string
  packageMonth?: string
  type: 'income' | 'expense'
  amount: number
  description: string
  status: 'paid' | 'pending' | 'overdue'
  category?: string
  dueDate?: string
  paidAt?: string
  method?: 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'transfer' | 'manual'
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
  falta: 'Falta',
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
  identidade:    'bg-mist-100 text-mist-700',
  progresso:     'bg-sage-100 text-sage-700',
  crise:         'bg-red-100 text-red-700',
  outro:         'bg-neutral-100 text-neutral-600',
  falta:         'bg-rose-200 text-rose-800',
}
