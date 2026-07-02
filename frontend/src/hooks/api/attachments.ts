import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type PatientAttachment = {
  id: string
  filename: string
  mimeType: string
  size: number
  createdAt: string
}

export function usePatientAttachments(patientId?: string) {
  return useQuery<PatientAttachment[]>({
    queryKey: ['patient-attachments', patientId],
    queryFn: () => api.get(`/patients/${patientId}/attachments`).then(r => r.data),
    enabled: !!patientId,
  })
}

export function useUploadPatientAttachment(patientId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post<PatientAttachment>(`/patients/${patientId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-attachments', patientId] }),
  })
}

export function useDeletePatientAttachment(patientId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: string) =>
      api.delete(`/patients/${patientId}/attachments/${attachmentId}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-attachments', patientId] }),
  })
}

export async function downloadPatientAttachment(patientId: string, attachment: PatientAttachment) {
  const response = await api.get(
    `/patients/${patientId}/attachments/${attachment.id}/download`,
    { responseType: 'blob' },
  )
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = attachment.filename
  link.click()
  URL.revokeObjectURL(url)
}
