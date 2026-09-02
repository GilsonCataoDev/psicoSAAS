/**
 * Profissão do titular da conta. Define o vocabulário da interface e quais
 * módulos ficam visíveis — NÃO confundir com `User.specialty`, que é texto
 * livre da abordagem/subespecialidade (ex: "Terapia Cognitivo-Comportamental")
 * e é exibido publicamente na página de agendamento e nos depoimentos.
 *
 * `psicologia` é o padrão histórico: toda conta criada antes desta coluna
 * existir recebe esse valor, então nada muda para quem já usa o produto.
 * Qualquer outra profissão cai no vocabulário genérico (cliente/ficha/atendimento)
 * e não enxerga os módulos exclusivos de psicologia.
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

/** Rótulo exibido na interface para cada profissão. */
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

/**
 * Módulos exclusivos de psicologia (avaliação neuropsicológica, instrumentos
 * psicométricos) só aparecem para contas de psicologia. Generalizá-los custaria
 * semanas; escondê-los é uma checagem.
 */
export function hasPsychologyModules(profession?: string | null): boolean {
  return (profession ?? DEFAULT_PROFESSION) === 'psicologia'
}

/** CRP só é obrigatório para psicólogos — outras profissões têm outros conselhos. */
export function requiresCrp(profession?: string | null): boolean {
  return (profession ?? DEFAULT_PROFESSION) === 'psicologia'
}
