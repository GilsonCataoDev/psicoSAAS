import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type AiConsentScope = 'clinical_ai_processing' | 'session_recording_transcription' | 'neuropsych_ai'
export type AiConsentStatus = { active: boolean; acceptedAt: string | null; textVersion: string | null }

export const AI_CONSENT_TEXT = {
  clinical_ai_processing: {
    version: 'clinical-ai-v1',
    text: 'Confirmo que entendi que os dados clinicos selecionados serao pseudonimizados e processados por um provedor externo de IA. A resposta e apenas um rascunho, deve ser revisada e nao substitui minha responsabilidade profissional.',
  },
  session_recording_transcription: {
    version: 'recording-transcription-v1',
    text: 'Confirmo que o paciente autorizou a gravacao e a transcricao desta sessao. O audio sera processado somente para transcricao e nao sera armazenado pelo UseCognia.',
  },
  neuropsych_ai: {
    version: 'neuropsych-ai-v1',
    text: 'Confirmo que entendi os limites do Copiloto Neuropsicologico: os dados selecionados serao pseudonimizados, a IA nao corrige testes protegidos nem produz diagnostico definitivo, e toda conclusao sera revisada por mim.',
  },
} as const

const key = (scope: AiConsentScope, patientId?: string) => ['ai-consent', scope, patientId ?? 'global']

export function useAiConsent(scope: AiConsentScope, patientId?: string, enabled = true) {
  return useQuery({
    queryKey: key(scope, patientId),
    queryFn: () => api.get<AiConsentStatus>(`/ai-governance/consents/${scope}`, { params: { patientId } }).then(r => r.data),
    enabled,
  })
}

export function useAcceptAiConsent(scope: AiConsentScope, patientId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<AiConsentStatus>(`/ai-governance/consents/${scope}`, {
      patientId,
      textVersion: AI_CONSENT_TEXT[scope].version,
      textSnapshot: AI_CONSENT_TEXT[scope].text,
      source: scope === 'session_recording_transcription' ? 'professional_attestation' : 'professional_acknowledgement',
    }).then(r => r.data),
    onSuccess: data => qc.setQueryData(key(scope, patientId), data),
  })
}
