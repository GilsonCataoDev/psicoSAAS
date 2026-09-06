/**
 * Espelho de backend/src/common/professions.ts — manter os dois em sincronia.
 *
 * `profession` define o vocabulário da interface e quais módulos aparecem.
 * NÃO confundir com `specialty`, que é texto livre da abordagem
 * (ex: "Terapia Cognitivo-Comportamental") e é exibido publicamente.
 */
export const PROFESSIONS = [
  'psicologia',
  'psiquiatria',
  'nutricao',
  'fisioterapia',
  'fonoaudiologia',
  'terapia_ocupacional',
  'assistencia_social',
  'odontologia',
  'personal_trainer',
  'outro',
] as const

export type Profession = (typeof PROFESSIONS)[number]

export const DEFAULT_PROFESSION: Profession = 'psicologia'

export const PROFESSION_LABELS: Record<Profession, string> = {
  psicologia: 'Psicologia',
  psiquiatria: 'Psiquiatria',
  nutricao: 'Nutrição',
  fisioterapia: 'Fisioterapia',
  fonoaudiologia: 'Fonoaudiologia',
  terapia_ocupacional: 'Terapia Ocupacional',
  assistencia_social: 'Serviço Social',
  odontologia: 'Odontologia',
  personal_trainer: 'Personal Trainer',
  outro: 'Outra profissão',
}

/** Conta de psicologia (padrão) enxerga avaliação neuropsicológica e instrumentos. */
export function hasPsychologyModules(profession?: string | null): boolean {
  return (profession ?? DEFAULT_PROFESSION) === 'psicologia'
}

/** CRP só é obrigatório para psicologia — outras profissões têm outros conselhos. */
export function requiresCrp(profession?: string | null): boolean {
  return (profession ?? DEFAULT_PROFESSION) === 'psicologia'
}

/**
 * Sigla do conselho de classe por profissão. A coluna `User.crp` guarda o
 * registro de qualquer conselho — só o rótulo muda. Sem isto, o registro de
 * uma nutricionista aparece anunciado como "CRP" nas telas públicas
 * (agendamento, verificação de documento, portal do paciente).
 *
 * Terapia ocupacional divide o CREFITO com a fisioterapia.
 */
export const COUNCIL_LABELS: Record<Profession, string | null> = {
  psicologia: 'CRP',
  psiquiatria: 'CRM',
  nutricao: 'CRN',
  fisioterapia: 'CREFITO',
  fonoaudiologia: 'CRFa',
  terapia_ocupacional: 'CREFITO',
  assistencia_social: 'CRESS',
  odontologia: 'CRO',
  personal_trainer: 'CREF',
  outro: null,
}

/**
 * Rótulo do registro profissional para exibição. `outro` não tem conselho
 * conhecido, então cai no genérico em vez de mentir uma sigla.
 */
export function councilLabel(profession?: string | null): string {
  const key = (profession ?? DEFAULT_PROFESSION) as Profession
  return COUNCIL_LABELS[key] ?? 'Registro profissional'
}

/**
 * Formata o registro para exibição inline (label + valor em texto corrido).
 * Psicologia armazena só o número ("06/123456") → prefixar com "CRP".
 * Demais profissões armazenam o valor completo ("CRN-3 12345") → exibir direto.
 * Retorna null quando registration é vazio ou nulo.
 */
export function formatRegistration(
  profession?: string | null,
  registration?: string | null,
): string | null {
  if (!registration) return null
  return requiresCrp(profession) ? `CRP ${registration}` : registration
}
