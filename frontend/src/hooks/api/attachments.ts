import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type PatientAttachment = {
  id: string
  filename: string
  mimeType: string
  size: number
  kind: 'test_result' | 'final_report' | 'supporting_document' | 'other'
  assessmentId?: string
  createdAt: string
}

export function usePatientAttachments(patientId?: string, assessmentId?: string) {
  return useQuery<PatientAttachment[]>({
    queryKey: ['patient-attachments', patientId, assessmentId],
    queryFn: () => api.get(`/patients/${patientId}/attachments`, { params: assessmentId ? { assessmentId } : undefined }).then(r => r.data),
    enabled: !!patientId,
  })
}

export function useUploadPatientAttachment(patientId?: string, assessmentId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, kind = 'other' }: { file: File; kind?: PatientAttachment['kind'] }) => {
      const form = new FormData()
      form.append('file', file)
      form.append('kind', kind)
      if (assessmentId) form.append('assessmentId', assessmentId)
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

async function fetchPatientAttachmentBlob(patientId: string, attachmentId: string): Promise<Blob> {
  const response = await api.get(
    `/patients/${patientId}/attachments/${attachmentId}/download`,
    { responseType: 'blob' },
  )
  return response.data
}

export async function downloadPatientAttachment(patientId: string, attachment: PatientAttachment) {
  const blob = await fetchPatientAttachmentBlob(patientId, attachment.id)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = attachment.filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Retorna uma object URL para exibir o documento inline. Chame URL.revokeObjectURL(url) ao fechar o preview. */
export async function previewPatientAttachment(patientId: string, attachment: PatientAttachment): Promise<string> {
  const blob = await fetchPatientAttachmentBlob(patientId, attachment.id)
  return URL.createObjectURL(blob)
}
