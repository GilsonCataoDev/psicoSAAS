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

/**
 * Charset aceito num registro de conselho (CRN-3 12345, CREFITO-3/12345-F...).
 * O formato varia por conselho, entao so barramos o que nao pode aparecer.
 */
export const COUNCIL_REGISTRATION_FORMAT = /^[A-Za-z0-9/\-. ]{0,30}$/

/** Formato do CRP: regiao 01-24 + numero. Fonte unica para DTO e service. */
export const CRP_FORMAT = /^(0[1-9]|1[0-9]|2[0-4])\/\d{4,6}$/

/** CRP só é obrigatório para psicólogos — outras profissões têm outros conselhos. */
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
  nutricao: 'CRN',
  fisioterapia: 'CREFITO',
  fonoaudiologia: 'CRFa',
  terapia_ocupacional: 'CREFITO',
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
