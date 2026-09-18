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
  'estetica',
  'outro',
] as const

export type Profession = (typeof PROFESSIONS)[number]

export const DEFAULT_PROFESSION: Profession = 'psicologia'

/** Espelho de backend/src/common/professions.ts. */
export const PROFESSION_CAPABILITIES = [
  'instruments',
  'neuropsych_assessments',
  'nutrition_assessments',
  'nutrition_plans',
] as const

export type ProfessionCapability = (typeof PROFESSION_CAPABILITIES)[number]

const CAPABILITIES_BY_PROFESSION: Record<Profession, readonly ProfessionCapability[]> = {
  psicologia: ['instruments', 'neuropsych_assessments'],
  psiquiatria: [],
  nutricao: ['instruments', 'nutrition_assessments', 'nutrition_plans'],
  fisioterapia: ['instruments'],
  fonoaudiologia: [],
  terapia_ocupacional: [],
  assistencia_social: [],
  odontologia: [],
  personal_trainer: [],
  estetica: ['instruments'],
  outro: [],
}

/** Conta antiga sem profissão preserva psicologia; valor inválido não libera módulo restrito. */
export function hasProfessionCapability(
  profession: string | null | undefined,
  capability: ProfessionCapability,
): boolean {
  const resolved = profession ?? DEFAULT_PROFESSION
  return (CAPABILITIES_BY_PROFESSION[resolved as Profession] ?? []).includes(capability)
}

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
  estetica: 'Estética',
  outro: 'Outra profissão',
}

/** Conta de psicologia (padrão) enxerga avaliação neuropsicológica e instrumentos. */
export function hasPsychologyModules(profession?: string | null): boolean {
  return (profession ?? DEFAULT_PROFESSION) === 'psicologia'
}

/**
 * A Resolução COFFITO 414/2012 exige no prontuário campos que o registro de
 * psicologia não tem: exame físico por semiologia fisioterapêutica, diagnóstico
 * e prognóstico cinesiofuncional, e o quantitativo provável de atendimentos.
 *
 * Restrito a `fisioterapia`. A 414/2012 também alcança terapia ocupacional, mas
 * o vocabulário do diagnóstico é outro — incluir TO aqui rotularia a tela dela
 * com termos que não são os da profissão.
 */
export function hasPhysiotherapyModules(profession?: string | null): boolean {
  return (profession ?? DEFAULT_PROFESSION) === 'fisioterapia'
}

/**
 * Nutricionistas têm catálogo de instrumentos clínicos e calculadoras
 * antropométricas/nutricionais próprias.
 */
export function hasNutritionModules(profession?: string | null): boolean {
  return (profession ?? DEFAULT_PROFESSION) === 'nutricao'
}

/**
 * Esteticistas têm ficha de atendimento própria com campos de pele, fototipo
 * e contraindicações. Não há conselho federal autárquico (Lei 13.643/2018).
 */
export function hasAestheticsModules(profession?: string | null): boolean {
  return (profession ?? DEFAULT_PROFESSION) === 'estetica'
}

/**
 * Profissões que têm instrumentos próprios no catálogo e por isso enxergam
 * `/instrumentos`. Não confundir com `/avaliacoes` (laudo neuropsicológico),
 * que segue exclusivo de psicologia.
 */
export function hasInstrumentsModule(profession?: string | null): boolean {
  return hasProfessionCapability(profession, 'instruments')
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
  estetica: null,
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
