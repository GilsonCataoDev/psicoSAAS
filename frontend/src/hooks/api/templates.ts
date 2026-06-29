import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export type TemplateType = 'patient_form' | 'session_note' | 'document' | 'whatsapp_message' | 'receipt'

export type Template = {
  id: string
  type: TemplateType
  name: string
  content: string
  tags: string[]
  isDefault: boolean
}

export function useTemplates(type?: TemplateType) {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<Template[]>({
    queryKey: ['templates', userId, type],
    queryFn: () => api.get('/templates', { params: type ? { type } : undefined }).then(r => r.data),
    enabled: !!userId,
  })
}

export function useDefaultTemplate(type: TemplateType) {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<Template | null>({
    queryKey: ['templates', userId, type, 'default'],
    queryFn: () => api.get(`/templates/${type}`).then(r => r.data),
    enabled: !!userId,
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { type: TemplateType; name: string; content: string; tags?: string[] }) =>
      api.post('/templates', data).then(r => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      qc.invalidateQueries({ queryKey: ['templates', vars.type] })
    },
  })
}
