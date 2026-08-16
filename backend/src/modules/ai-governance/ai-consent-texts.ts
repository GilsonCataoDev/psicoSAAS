import { AiConsentScope } from './entities/ai-consent-event.entity'

export const AI_CONSENT_TEXTS: Record<AiConsentScope, { version: string; text: string }> = {
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
}
