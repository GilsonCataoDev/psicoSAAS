import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Patient } from '@/types'

type NullablePatientField =
  | 'email'
  | 'phone'
  | 'birthDate'
  | 'pronouns'
  | 'race'
  | 'gender'
  | 'sexualOrientation'
  | 'startDate'
  | 'cpfCnpj'

export type UpdatePatientData =
  & Omit<Partial<Patient>, NullablePatientField>
  & { [Field in NullablePatientField]?: Patient[Field] | null }
  & { prontuario?: Record<string, any>; privateNotes?: string }

export function usePatients(options?: { enabled?: boolean }) {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<Patient[]>({
    queryKey: ['patients', userId],
    queryFn: () => api.get('/patients').then(r => r.data),
    enabled: (options?.enabled ?? true) && !!userId,
  })
}

export function usePatient(id: string) {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<Patient>({
    queryKey: ['patients', userId, id],
    queryFn: () => api.get(`/patients/${id}`).then(r => r.data),
    enabled: !!userId && !!id,
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
    mutationFn: ({ id, data }: { id: string; data: UpdatePatientData }) =>
      api.patch(`/patients/${id}`, data).then(r => r.data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      qc.invalidateQueries({ queryKey: ['patients', vars.id] })
    },
  })
}

export function useDeletePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/patients/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}

export type ImportSkipReason = 'duplicate' | 'plan_limit_reached'

export type ImportPatientsResult = {
  totalRows: number
  importedCount: number
  skippedCount: number
  errorCount: number
  imported: { row: number; id: string; name: string }[]
  skipped: { row: number; name?: string; reason: ImportSkipReason; details?: string }[]
  errors: { row: number; name?: string; errors: string[] }[]
  upgradeUrl?: string
  currentPlan?: string
}

export function useImportPatients() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post<ImportPatientsResult>('/patients/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}

export async function downloadPatientsImportTemplate() {
  const res = await api.get('/patients/import/template', { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
  const a = document.createElement('a')
  const cd = res.headers['content-disposition'] as string | undefined
  const match = cd?.match(/filename="([^"]+)"/)
  a.href = url
  a.download = match?.[1] ?? 'modelo-importacao-pacientes.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export type ProntuarioExportOptions = {
  audience?: 'professional' | 'patient'
  fromDate?: string
  toDate?: string
  sections?: Array<'identification' | 'anamnesis' | 'treatment_plan' | 'evolutions'>
}

export function useExportProntuario(patientId: string) {
  return useMutation({
    mutationFn: async (options: ProntuarioExportOptions = {}) => {
      const params = {
        ...options,
        sections: options.sections?.join(','),
      }
      const res = await api.get(`/patients/${patientId}/prontuario/export`, { params, responseType: 'blob' })
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
