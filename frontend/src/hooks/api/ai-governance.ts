import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type AiConsentScope = 'clinical_ai_processing' | 'session_recording_transcription' | 'neuropsych_ai'
export type AiConsentStatus = {
  active: boolean
  acceptedAt: string | null
  /** Versao que o profissional aceitou, se ja aceitou. */
  textVersion: string | null
  /** Texto canonico a exibir e devolver no aceite. */
  text: string
  /** Versao canonica atual para a profissao da conta. */
  version: string
}

// O texto do consentimento NÃO vive aqui: vem do backend junto do status
// (campos `text` e `version`). Ter cópia local significava que qualquer
// divergência com o backend impedia o profissional de consentir — o aceite é
// comparado byte a byte no servidor — e derrubava a gravação de sessão.

const key = (scope: AiConsentScope, patientId?: string) => ['ai-consent', scope, patientId ?? 'global']

export function useAiConsent(scope: AiConsentScope, patientId?: string, enabled = true) {
  return useQuery({
    queryKey: key(scope, patientId),
    queryFn: () => api.get<AiConsentStatus>(`/ai-governance/consents/${scope}`, { params: { patientId } }).then(r => r.data),
    enabled,
  })
}

/**
 * Devolve exatamente o texto e a versão que o backend entregou no status —
 * nunca uma constante local. Se o status ainda não carregou, o aceite falha
 * cedo aqui em vez de mandar um snapshot vazio que o servidor recusaria.
 */
export function useAcceptAiConsent(scope: AiConsentScope, patientId?: string) {
  const qc = useQueryClient()
  const consent = useAiConsent(scope, patientId)
  return useMutation({
    mutationFn: () => {
      const canonical = consent.data
      if (!canonical?.text || !canonical?.version) {
        return Promise.reject(new Error('Texto de consentimento ainda não carregado. Tente novamente.'))
      }
      return api.post<AiConsentStatus>(`/ai-governance/consents/${scope}`, {
        patientId,
        textVersion: canonical.version,
        textSnapshot: canonical.text,
        source: scope === 'session_recording_transcription' ? 'professional_attestation' : 'professional_acknowledgement',
      }).then(r => r.data)
    },
    onSuccess: data => qc.setQueryData(key(scope, patientId), data),
  })
}
