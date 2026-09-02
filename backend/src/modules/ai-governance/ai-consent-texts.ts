import { AiConsentScope } from './entities/ai-consent-event.entity'
import { hasPsychologyModules } from '../../common/professions'

export type AiConsentText = { version: string; text: string }

/**
 * FONTE ÚNICA do texto de consentimento. O frontend NÃO tem cópia: recebe o
 * texto e a versão pelo endpoint de status e devolve exatamente o que recebeu.
 *
 * O motivo é que `accept()` compara o snapshot enviado byte a byte com o texto
 * canônico — enquanto havia duas cópias, qualquer divergência entre elas
 * impedia o profissional de consentir e derrubava a gravação de sessão.
 *
 * A versão é gravada no evento como prova do que foi aceito. Texto diferente
 * exige versão diferente, senão a trilha de auditoria fica ambígua: por isso a
 * variante genérica tem sufixo próprio em vez de reusar a v1 de psicologia.
 */
const PSICOLOGIA: Record<AiConsentScope, AiConsentText> = {
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

const GENERICO: Record<AiConsentScope, AiConsentText> = {
  clinical_ai_processing: {
    version: 'clinical-ai-generico-v1',
    text: 'Confirmo que entendi que os dados selecionados serao pseudonimizados e processados por um provedor externo de IA. A resposta e apenas um rascunho, deve ser revisada e nao substitui minha responsabilidade profissional.',
  },
  session_recording_transcription: {
    version: 'recording-transcription-generico-v1',
    text: 'Confirmo que o cliente autorizou a gravacao e a transcricao deste atendimento. O audio sera processado somente para transcricao e nao sera armazenado pelo UseCognia.',
  },
  // Copiloto neuropsicologico e exclusivo de psicologia; mantido por completude
  // do Record, mas a conta generica nao alcanca o recurso.
  neuropsych_ai: {
    version: 'neuropsych-ai-v1',
    text: 'Confirmo que entendi os limites do Copiloto Neuropsicologico: os dados selecionados serao pseudonimizados, a IA nao corrige testes protegidos nem produz diagnostico definitivo, e toda conclusao sera revisada por mim.',
  },
}

export function aiConsentText(scope: AiConsentScope, profession?: string | null): AiConsentText {
  return hasPsychologyModules(profession) ? PSICOLOGIA[scope] : GENERICO[scope]
}

/**
 * Todas as versões já emitidas de um escopo. `accept()` valida contra o texto
 * atual da profissão, mas consentimentos antigos continuam válidos mesmo se o
 * profissional trocar de profissão depois.
 */
export function knownVersions(scope: AiConsentScope): string[] {
  return [...new Set([PSICOLOGIA[scope].version, GENERICO[scope].version])]
}
