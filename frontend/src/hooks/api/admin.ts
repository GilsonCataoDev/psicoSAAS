import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface AdminUser {
  id: string
  name: string
  email: string
  crp: string
  specialty: string
  isActive: boolean
  emailVerified: boolean
  createdAt: string
  lastActiveAt?: string | null
  subscription: {
    id: string
    plan: string
    status: string
    trialEndsAt: string | null
    currentPeriodEnd?: string | null
    cancelAtPeriodEnd: boolean
    hasUsedTrial: boolean
  } | null
}

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  mrr: number
  byPlanStatus: { plan: string; status: string; count: string }[]
}

export interface AdminMonitor {
  generatedAt: string
  system: {
    database: { ok: boolean; latencyMs: number; checkedAt: string }
    integrations: {
      resend: { configured: boolean; fromConfigured: boolean }
      asaas: { configured: boolean; webhookProtected: boolean }
      whatsapp: { configured: boolean; operational: boolean | null; last24h: { sent: number; failed: number } }
      webPush: { configured: boolean }
    }
  }
  email: {
    last7d: { sent: number; failed: number }
    failureRate: number
    recentFailures: { id: string; to: string; subject: string; error: string | null; createdAt: string }[]
  }
  billing: {
    byStatus: Record<string, number>
    pastDueAccounts: { id: string; plan: string; status: string; createdAt: string; user: { id: string; name: string; email: string } }[]
    recentWebhooks: { id: string; eventType: string; eventId: string; processedAt: string }[]
  }
}

export interface HealthScore {
  id: string
  name: string
  email: string
  lastActiveAt: string | null
  createdAt: string
  plan: string | null
  subscriptionStatus: string | null
  patientCount: number
  sessionsLast30d: number
  hasFinancialLast30d: boolean
  hasAiUsageLast30d: boolean
  rawScore: number
  score: number
  tier: 'healthy' | 'attention' | 'risk'
}

export interface HealthScoresResponse {
  data: HealthScore[]
  total: number
  generatedAt: string
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
  })
}

export function useAdminUsers(params: { page?: number; search?: string; plan?: string; status?: string } = {}) {
  return useQuery<{ data: AdminUser[]; total: number; page: number; limit: number }>({
    queryKey: ['admin', 'users', params],
    queryFn: () => api.get('/admin/users', { params }).then(r => r.data),
  })
}

export function useAdminOverrideSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, status, plan }: { userId: string; status?: string; plan?: string }) =>
      api.patch(`/admin/users/${userId}/subscription`, { status, plan }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useAdminMonitor() {
  return useQuery<AdminMonitor>({
    queryKey: ['admin', 'monitor'],
    queryFn: () => api.get('/admin/monitor').then(r => r.data),
    refetchInterval: 60_000,
  })
}

export function useAdminHealthScores() {
  return useQuery<HealthScoresResponse>({
    queryKey: ['admin', 'health-scores'],
    queryFn: () => api.get('/admin/health-scores').then(r => r.data),
    refetchInterval: 5 * 60 * 1000,
  })
}

export function useImpersonateUser() {
  return useMutation({
    mutationFn: (userId: string) =>
      api.post(`/auth/impersonate/${userId}`).then(r => r.data as { user: any; csrfToken: string }),
  })
}

export function useCleanupTestUsers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete('/admin/cleanup-test-users').then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useSendProUpgradeCampaign() {
  return useMutation({
    mutationFn: () => api.post('/admin/campaigns/pro-upgrade/send').then(r => r.data as {
      eligible: number
      sent: number
      failed: number
    }),
  })
}
