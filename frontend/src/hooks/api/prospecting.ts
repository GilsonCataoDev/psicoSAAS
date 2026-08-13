import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type ProspectStatus =
  | 'discovered' | 'analyzing' | 'analyzed' | 'qualified' | 'approved'
  | 'contacted' | 'replied' | 'interested' | 'registered' | 'activated'
  | 'discarded' | 'do_not_contact' | 'expired' | 'error'

export type ProspectSourceType = 'own_site' | 'linkedin_search' | 'psymeet_search' | 'directory_search'
export type ProspectConfidence = 'low' | 'medium' | 'high'

export interface ProspectSignal {
  id: string
  type: string
  points: number
  confidence: ProspectConfidence
  evidence: string
  evidenceUrl: string | null
  detector: string
  detectedAt: string
}

export interface ProspectActivity {
  id: string
  action: string
  actorUserId: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface Prospect {
  id: string
  professionalName: string | null
  city: string | null
  state: string | null
  website: string | null
  websiteDomain: string | null
  professionalEmail: string | null
  professionalPhone: string | null
  linkedinUrl: string | null
  psymeetUrl: string | null
  sourceUrl: string
  sourceType: ProspectSourceType
  sourceTitle: string | null
  sourceSnippet: string | null
  score: number
  confidence: ProspectConfidence
  status: ProspectStatus
  discoveredAt: string
  analyzedAt: string | null
  doNotContact: boolean
  retentionUntil: string
  createdAt: string
}

export interface ProspectingSearch {
  id: string
  city: string | null
  state: string | null
  query: string
  provider: string
  resultCount: number
  status: 'pending' | 'running' | 'completed' | 'error'
  startedAt: string | null
  finishedAt: string | null
  errorMessage: string | null
  createdAt: string
}

export interface SearchFilters {
  city: string
  state?: string
  profession?: string
  approach?: string
  modality?: 'online' | 'presencial' | 'ambos'
  sources: ProspectSourceType[]
}

export interface ProspectFilters {
  city?: string
  state?: string
  status?: ProspectStatus
  minScore?: number
  source?: string
  hasEmail?: boolean
  hasPhone?: boolean
  hasLinkedin?: boolean
  hasPsymeet?: boolean
}

export interface ProspectingMetrics {
  searchesRun: number
  discovered?: number
  analyzed?: number
  qualified?: number
  approved?: number
  contacted?: number
  replied?: number
  registered?: number
  activated?: number
  [status: string]: number | undefined
}

export function useProspectingMetrics() {
  return useQuery<ProspectingMetrics>({
    queryKey: ['admin', 'prospecting', 'metrics'],
    queryFn: () => api.get('/admin/prospecting/metrics').then(r => r.data),
    refetchInterval: 60_000,
  })
}

export function useProspectingSearches() {
  return useQuery<ProspectingSearch[]>({
    queryKey: ['admin', 'prospecting', 'searches'],
    queryFn: () => api.get('/admin/prospecting/searches').then(r => r.data),
  })
}

export function usePreviewSearch() {
  return useMutation({
    mutationFn: (filters: SearchFilters) =>
      api.post('/admin/prospecting/searches/preview', filters).then(r => r.data as { queries: string[]; sample: { title: string; url: string; snippet: string; source: string }[] }),
  })
}

export function useCreateSearch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (filters: SearchFilters) => api.post('/admin/prospecting/searches', filters).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'prospecting'] })
    },
  })
}

export function useProspects(filters: ProspectFilters = {}) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''))
  return useQuery<Prospect[]>({
    queryKey: ['admin', 'prospecting', 'prospects', params],
    queryFn: () => api.get('/admin/prospecting/prospects', { params }).then(r => r.data),
  })
}

export function useProspect(id: string | null) {
  return useQuery<{ prospect: Prospect; signals: ProspectSignal[]; activities: ProspectActivity[] }>({
    queryKey: ['admin', 'prospecting', 'prospect', id],
    queryFn: () => api.get(`/admin/prospecting/prospects/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

function useProspectAction(action: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.post(`/admin/prospecting/prospects/${id}/${action}`, { notes }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'prospecting'] }),
  })
}

export function useAnalyzeProspect() {
  return useProspectAction('analyze')
}

export function useApproveProspect() {
  return useProspectAction('approve')
}

export function useDiscardProspect() {
  return useProspectAction('discard')
}

export function useDoNotContactProspect() {
  return useProspectAction('do-not-contact')
}

export function useDeleteProspect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/prospecting/prospects/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'prospecting'] }),
  })
}

export function useGenerateDraft() {
  return useMutation({
    mutationFn: (id: string) => api.post(`/admin/prospecting/prospects/${id}/draft`).then(r => r.data as { draft: string; source: 'ai' | 'template' }),
  })
}

export type ReplyChannel = 'whatsapp' | 'direct'
export type ManualProspectStage = 'discovered' | 'contacted' | 'replied' | 'interested' | 'registered' | 'activated' | 'discarded'

export function useUpdateProspectStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ManualProspectStage }) =>
      api.post(`/admin/prospecting/prospects/${id}/stage`, { status }).then(r => r.data as Prospect),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'prospecting'] }),
  })
}

export type SalesConversationAnalysis = {
  stage: 'new' | 'engaged' | 'qualified' | 'trial' | 'won' | 'lost'
  interestLevel: 'low' | 'medium' | 'high'
  painPoints: string[]
  objections: string[]
  positiveSignals: string[]
  nextAction: string
  suggestedReply: string
  shouldStopContact: boolean
  reasoning: string
}

export function useAnalyzeSalesConversation() {
  return useMutation({
    mutationFn: ({ channel, conversation }: { channel: ReplyChannel; conversation: string }) =>
      api.post('/admin/prospecting/assistant/analyze', { channel, conversation })
        .then(r => r.data as SalesConversationAnalysis),
  })
}

export function useSuggestReply() {
  return useMutation({
    mutationFn: ({ id, channel, leadReplyText, priorMessage }: { id: string; channel: ReplyChannel; leadReplyText: string; priorMessage?: string }) =>
      api.post(`/admin/prospecting/prospects/${id}/suggest-reply`, { channel, leadReplyText, priorMessage }).then(r => r.data as { suggestion: string }),
  })
}

export function useExportProspect() {
  return useMutation({
    mutationFn: (id: string) => api.get(`/admin/prospecting/prospects/${id}/export`).then(r => r.data),
  })
}
