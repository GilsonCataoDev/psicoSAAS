import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { DocumentoListItem } from '@/types/prontuario'

export function useDocuments() {
  return useQuery<DocumentoListItem[]>({
    queryKey: ['documents'],
    queryFn: () => api.get('/documents').then(r => r.data),
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
