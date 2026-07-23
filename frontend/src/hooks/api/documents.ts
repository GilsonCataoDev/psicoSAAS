import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { DocumentoListItem } from '@/types/prontuario'

export function useDocuments() {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<DocumentoListItem[]>({
    queryKey: ['documents', userId],
    queryFn: () => api.get('/documents').then(r => r.data),
    enabled: !!userId,
  })
}

export function useCreateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { patientId: string; patientName: string; type: string; title: string; content: string }) =>
      api.post('/documents', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export type DocumentAiField = 'demand' | 'procedure' | 'analysis' | 'conclusion' | 'referralReason'

export function useGenerateDocumentAiDraft() {
  return useMutation({
    mutationFn: (data: {
      documentType: 'relatorio' | 'atestado' | 'encaminhamento'
      field: DocumentAiField
      input: string
    }) => api.post<{ draft: string }>('/documents/ai-draft', data).then(r => r.data),
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useSendDocumentByEmail() {
  return useMutation({
    mutationFn: ({ id, to }: { id: string; to: string }) =>
      api.post(`/documents/${id}/send-email`, { to }).then(r => r.data),
  })
}
