/**
 * Redução de identificadores diretos em texto livre, antes de enviar ao
 * provedor externo de IA.
 *
 * IMPORTANTE — isto NÃO é anonimização. É uma camada de redução de risco por
 * padrões (regex + nome do paciente quando disponível), best-effort. Não
 * detecta identificadores parafraseados, mal formatados fora do esperado, ou
 * qualquer dado sensível que não se encaixe nos padrões abaixo. O produto e a
 * documentação devem sempre usar a expressão "redução de identificadores
 * diretos" — nunca "anonimização" ou "garantia de privacidade".
 *
 * Nunca logar o texto de entrada nem o texto de saída desta função.
 */

const CPF_RE = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g
const RG_RE = /\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dXx]\b/g
const CEP_RE = /\b\d{5}-?\d{3}\b/g
const PHONE_RE = /(\+?55\s?)?\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}\b/g
const EMAIL_RE = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g
const URL_RE = /\bhttps?:\/\/\S+/gi
const UUID_RE = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g
/** Tokens/segredos longos alfanuméricos (ex.: tokens de link público, chaves). */
const LONG_TOKEN_RE = /\b(?=[A-Za-z0-9_-]{24,}\b)(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{24,}\b/g
/** Data numérica completa (dd/mm/aaaa, dd-mm-aaaa) perto de palavras de nascimento. */
const BIRTHDATE_NEAR_KEYWORD_RE = /(nascimento|nascido|nascida|\bDN\b|data de nasc\w*)[^.\n]{0,30}?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/gi
/** Endereço: tipo de logradouro + texto até encontrar um número. */
const ADDRESS_RE = /\b(rua|av\.?|avenida|alameda|travessa|rodovia|estrada)\s+[^,\n]{2,60}?,?\s*n?[ºo°]?\s*\d{1,6}\b/gi

const REDACTION_PASSES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: EMAIL_RE, label: '[e-mail removido]' },
  { pattern: URL_RE, label: '[link removido]' },
  { pattern: UUID_RE, label: '[identificador removido]' },
  { pattern: CPF_RE, label: '[CPF removido]' },
  { pattern: CEP_RE, label: '[CEP removido]' },
  { pattern: ADDRESS_RE, label: '[endereço removido]' },
  { pattern: BIRTHDATE_NEAR_KEYWORD_RE, label: '$1 [data de nascimento removida]' },
  { pattern: PHONE_RE, label: '[telefone removido]' },
  { pattern: RG_RE, label: '[RG removido]' },
  { pattern: LONG_TOKEN_RE, label: '[token removido]' },
]

/**
 * Aplica a redução de identificadores diretos a um texto livre.
 * Ordem importa: padrões mais específicos (e-mail, URL, UUID, CPF, CEP,
 * endereço, data de nascimento) rodam antes do padrão genérico de telefone,
 * que é o mais propenso a colidir com outros formatos numéricos.
 */
export function redactDirectIdentifiers(text: string | undefined | null): string | undefined {
  if (!text) return text ?? undefined
  let result = text
  for (const { pattern, label } of REDACTION_PASSES) {
    result = result.replace(pattern, label)
  }
  return result
}

/**
 * Remove ocorrências do nome do paciente (completo e cada parte com 3+
 * letras) do texto, quando o nome está disponível no contexto interno.
 * Best-effort: não pega apelidos, erros de digitação ou nomes parciais
 * fora dos tokens do nome cadastrado.
 */
export function redactPatientName(text: string | undefined, patientName: string | undefined): string | undefined {
  if (!text || !patientName?.trim()) return text
  const parts = patientName.trim().split(/\s+/).filter(part => part.length >= 3)
  if (!parts.length) return text
  let result = text
  const escaped = [...parts, patientName.trim()]
    .sort((a, b) => b.length - a.length)
    .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  for (const part of escaped) {
    result = result.replace(new RegExp(`\\b${part}\\b`, 'gi'), '[nome removido]')
  }
  return result
}

/** Aplica redução de identificadores diretos + nome do paciente, nessa ordem. */
export function sanitizeClinicalText(text: string | undefined, patientName: string | undefined): string | undefined {
  return redactPatientName(redactDirectIdentifiers(text), patientName)
}
