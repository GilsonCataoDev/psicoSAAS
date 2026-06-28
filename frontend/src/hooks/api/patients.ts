import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Patient } from '@/types'

export function usePatients(options?: { enabled?: boolean }) {
  return useQuery<Patient[]>({
    queryKey: ['patients'],
    queryFn: () => api.get('/patients').then(r => r.data),
    enabled: options?.enabled ?? true,
  })
}

export function usePatient(id: string) {
  return useQuery<Patient>({
    queryKey: ['patients', id],
    queryFn: () => api.get(`/patients/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

export function useCreatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Patient>) => api.post('/patients', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}

export function useCreatePatientPortalLink() {
  return useMutation({
    mutationFn: (patientId: string) =>
      api.post<{ url: string }>(`/patients/${patientId}/portal-link`).then(r => r.data),
  })
}

export function useUpdatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Patient> & { prontuario?: Record<string, any>; privateNotes?: string } }) =>
      api.patch(`/patients/${id}`, data).then(r => r.data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      qc.invalidateQueries({ queryKey: ['patients', vars.id] })
    },
  })
}

export function useExportProntuario(patientId: string) {
  return useMutation({
    mutationFn: async () => {
      const res = await api.get(`/patients/${patientId}/prontuario/export`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      const cd = res.headers['content-disposition'] as string | undefined
      const match = cd?.match(/filename="([^"]+)"/)
      a.href = url
      a.download = match?.[1] ?? `Prontuario_${patientId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
  })
}
