import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type ChurnRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type HealthTier = 'green' | 'yellow' | 'red'

export interface ChurnRecommendation {
  action: string
  label: string
  impact: 'high' | 'medium' | 'low'
  priority: number
}

export interface ChurnAccount {
  id: string
  name: string
  email: string
  phone: string | null
  plan: string | null
  subscriptionStatus: string | null
  lastActiveAt: string | null
  createdAt: string
  daysSinceLastActive: number | null
  patientCount: number
  sessionCount: number
  score: number
  riskLevel: ChurnRiskLevel
  tier: HealthTier
  reasons: string[]
  recommendations: ChurnRecommendation[]
  scoreBreakdown: {
    patients: number; sessions: number; appointments: number
    whatsapp: number; recency: number; penalties: number
  }
}

export interface ChurnDashboard {
  summary: {
    total: number
    healthy: number
    atRisk: number
    critical: number
    activationRate: number
    pendingAlerts: number
  }
  accounts: ChurnAccount[]
  generatedAt: string
}

export interface ChurnAlert {
  id: string
  userId: string
  type: string
  message: string
  metadata: Record<string, unknown> | null
  resolved: boolean
  resolvedAt: string | null
  createdAt: string
}

export interface ChurnAnalytics {
  totalAccounts: number
  activation7d: number
  activation30d: number
  riskDistribution: Record<ChurnRiskLevel, number>
}

export interface BehaviorTimeline {
  signupAt: string
  firstLoginAt: string | null
  firstPatientAt: string | null
  firstSessionAt: string | null
  firstAppointmentAt: string | null
  lastActiveAt: string | null
  daysSinceSignup: number
  daysSinceLastActive: number | null
}

export function useChurnDashboard(filters: { riskLevel?: ChurnRiskLevel; plan?: string; days?: number } = {}) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined))
  return useQuery<ChurnDashboard>({
    queryKey: ['admin', 'churn', 'dashboard', params],
    queryFn: () => api.get('/admin/churn/dashboard', { params }).then(r => r.data),
    refetchInterval: 5 * 60 * 1000,
  })
}

export function useChurnAnalytics() {
  return useQuery<ChurnAnalytics>({
    queryKey: ['admin', 'churn', 'analytics'],
    queryFn: () => api.get('/admin/churn/analytics').then(r => r.data),
    staleTime: 10 * 60 * 1000,
  })
}

export function useChurnAlerts(resolved?: boolean) {
  return useQuery<ChurnAlert[]>({
    queryKey: ['admin', 'churn', 'alerts', resolved],
    queryFn: () => api.get('/admin/churn/alerts', { params: { resolved } }).then(r => r.data),
    refetchInterval: 60_000,
  })
}

export function useResolveChurnAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/admin/churn/alerts/${id}/resolve`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'churn', 'alerts'] }),
  })
}

export function useUserTimeline(userId: string) {
  return useQuery<BehaviorTimeline>({
    queryKey: ['admin', 'churn', 'timeline', userId],
    queryFn: () => api.get(`/admin/churn/user/${userId}/timeline`).then(r => r.data),
    enabled: !!userId,
  })
}

export interface ChurnAiDiagnosis {
  riskLevel: ChurnRiskLevel
  explanation: string
  recommendations: ChurnRecommendation[]
}

export function useChurnAiDiagnosis() {
  return useMutation({
    mutationFn: (userId: string) =>
      api.get<ChurnAiDiagnosis>(`/admin/churn/user/${userId}/ai-diagnose`).then(r => r.data),
  })
}

export type WhatsAppDeliveryResult = {
  sent: boolean
  reason?: 'plan' | 'not_configured' | 'disconnected' | 'api_error' | 'invalid_content'
  error?: string
}

export function useSendChurnWhatsApp() {
  return useMutation({
    mutationFn: ({ userId, phone, message }: { userId: string; phone: string; message: string }) =>
      api.post<WhatsAppDeliveryResult>(`/admin/churn/user/${userId}/send-whatsapp`, { phone, message }).then(r => r.data),
  })
}

export function useSendReactivationEmail() {
  return useMutation({
    mutationFn: (userId: string) =>
      api.post(`/admin/churn/user/${userId}/send-reactivation`).then(r => r.data),
  })
}
