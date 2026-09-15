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

/**
 * Capacidades que não fazem parte do núcleo comum da plataforma. Este é o
 * ponto único para liberar ferramentas por área, sem espalhar verificações de
 * profissão pelos controllers e pela interface.
 */
export const PROFESSION_CAPABILITIES = [
  'instruments',
  'neuropsych_assessments',
] as const

export type ProfessionCapability = (typeof PROFESSION_CAPABILITIES)[number]

const CAPABILITIES_BY_PROFESSION: Record<Profession, readonly ProfessionCapability[]> = {
  psicologia: ['instruments', 'neuropsych_assessments'],
  psiquiatria: [],
  nutricao: ['instruments'],
  fisioterapia: ['instruments'],
  fonoaudiologia: [],
  terapia_ocupacional: [],
  assistencia_social: [],
  odontologia: [],
  personal_trainer: [],
  outro: [],
}

/**
 * Retorna se a conta pode usar uma capacidade. Conta antiga sem profissão
 * preserva o padrão histórico (psicologia); valor desconhecido nunca ganha
 * acesso a uma ferramenta restrita.
 */
export function hasProfessionCapability(
  profession: string | null | undefined,
  capability: ProfessionCapability,
): boolean {
  const resolved = profession || DEFAULT_PROFESSION
  return (CAPABILITIES_BY_PROFESSION[resolved as Profession] ?? []).includes(capability)
}

/** Rótulo exibido na interface para cada profissão. */
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

/**
 * Módulos exclusivos de psicologia (avaliação neuropsicológica, instrumentos
 * psicométricos) só aparecem para contas de psicologia. Generalizá-los custaria
 * semanas; escondê-los é uma checagem.
 */
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
 * Indica se a profissão tem acesso ao módulo de instrumentos (escalas,
 * formulários e avaliações padronizadas). Cobre psicologia, fisioterapia
 * e nutrição — espelho de `hasInstrumentsModule` do frontend.
 *
 * Nota: a autorização real dos endpoints é feita por
 * `hasProfessionCapability(profession, 'instruments')` via
 * `ProfessionCapabilityGuard` (global). Esta função existe para manter
 * o espelho frontend/backend sincronizado e para uso em lógica de negócio
 * que precise da mesma semântica fora do contexto de request HTTP.
 */
export function hasInstrumentsModule(profession?: string | null): boolean {
  return hasPsychologyModules(profession) || hasPhysiotherapyModules(profession) || hasNutritionModules(profession)
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
