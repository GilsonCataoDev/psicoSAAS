/**
 * Espelho de backend/src/common/professions.ts — manter os dois em sincronia.
 *
 * `profession` define o vocabulário da interface e quais módulos aparecem.
 * NÃO confundir com `specialty`, que é texto livre da abordagem
 * (ex: "Terapia Cognitivo-Comportamental") e é exibido publicamente.
 */
export const PROFESSIONS = [
  'psicologia',
  'nutricao',
  'fisioterapia',
  'fonoaudiologia',
  'terapia_ocupacional',
  'odontologia',
  'personal_trainer',
  'outro',
] as const

export type Profession = (typeof PROFESSIONS)[number]

export const DEFAULT_PROFESSION: Profession = 'psicologia'

export const PROFESSION_LABELS: Record<Profession, string> = {
  psicologia: 'Psicologia',
  nutricao: 'Nutrição',
  fisioterapia: 'Fisioterapia',
  fonoaudiologia: 'Fonoaudiologia',
  terapia_ocupacional: 'Terapia Ocupacional',
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
