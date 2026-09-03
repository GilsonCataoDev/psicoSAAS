/**
 * Validação manual (sem dependência externa) da resposta JSON da IA.
 * A resposta do modelo NUNCA é tratada como HTML/confiável — é dado bruto que
 * precisa sobreviver a: markdown ao redor do JSON, campos faltando, tipos
 * errados, ou o modelo simplesmente inventando um formato diferente.
 * Retorna null em qualquer caso de formato inválido, para o chamador aplicar
 * o fallback seguro (não persistir, não cobrar cota, avisar o usuário).
 */

export type NeuropsychCertainty = 'registered_data' | 'cautious_inference' | 'missing_information'

export type NeuropsychClinicalPoint = {
  text: string
  basis: string[]
  certainty: NeuropsychCertainty
}

export type NeuropsychAnalysisResult = {
  caseSynthesis: NeuropsychClinicalPoint[]
  convergences: NeuropsychClinicalPoint[]
  divergences: NeuropsychClinicalPoint[]
  possiblyPreservedFunctions: NeuropsychClinicalPoint[]
  possibleFragilities: NeuropsychClinicalPoint[]
  alternativeHypotheses: NeuropsychClinicalPoint[]
  missingInformation: string[]
  followUpQuestions: string[]
  verificationPoints: string[]
  suggestedIntegrationStructure: string[]
  disclaimers: string[]
}

const CERTAINTY_VALUES: NeuropsychCertainty[] = ['registered_data', 'cautious_inference', 'missing_information']
const POINT_FIELDS = [
  'caseSynthesis', 'convergences', 'divergences',
  'possiblyPreservedFunctions', 'possibleFragilities', 'alternativeHypotheses',
] as const
const STRING_ARRAY_FIELDS = [
  'missingInformation', 'followUpQuestions', 'verificationPoints',
  'suggestedIntegrationStructure', 'disclaimers',
] as const

const MAX_ITEMS_PER_SECTION = 30
const MAX_TEXT_LENGTH = 2000

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function parsePoint(raw: unknown): NeuropsychClinicalPoint | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (!isString(obj.text) || !obj.text.trim()) return null
  if (!isString(obj.certainty) || !CERTAINTY_VALUES.includes(obj.certainty as NeuropsychCertainty)) return null
  const basis = Array.isArray(obj.basis) ? obj.basis.filter(isString).slice(0, 20) : []
  return {
    text: obj.text.trim().slice(0, MAX_TEXT_LENGTH),
    basis: basis.map(item => item.slice(0, 200)),
    certainty: obj.certainty as NeuropsychCertainty,
  }
}

function parsePointArray(raw: unknown): NeuropsychClinicalPoint[] | null {
  if (!Array.isArray(raw)) return null
  const points: NeuropsychClinicalPoint[] = []
  for (const entry of raw.slice(0, MAX_ITEMS_PER_SECTION)) {
    const point = parsePoint(entry)
    if (point) points.push(point)
  }
  return points
}

function parseStringArray(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  return raw.filter(isString).slice(0, MAX_ITEMS_PER_SECTION).map(item => item.trim().slice(0, MAX_TEXT_LENGTH)).filter(Boolean)
}

/** Extrai o primeiro objeto JSON balanceado do texto, tolerando markdown ao redor. */
function extractJsonObject(text: string): unknown | null {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

export function parseNeuropsychAnalysis(rawText: string): NeuropsychAnalysisResult | null {
  const parsed = extractJsonObject(rawText)
  if (!parsed || typeof parsed !== 'object') return null
  const obj = parsed as Record<string, unknown>

  const result: Partial<NeuropsychAnalysisResult> = {}
  for (const field of POINT_FIELDS) {
    const points = parsePointArray(obj[field])
    if (points === null) return null
    result[field] = points
  }
  for (const field of STRING_ARRAY_FIELDS) {
    const items = parseStringArray(obj[field])
    if (items === null) return null
    result[field] = items
  }
  if (!result.disclaimers || result.disclaimers.length === 0) {
    result.disclaimers = ['Sugestão gerada por IA, sem valor diagnóstico. Revise antes de qualquer uso clínico.']
  }
  return result as NeuropsychAnalysisResult
}
