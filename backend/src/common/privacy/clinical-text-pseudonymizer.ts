/**
 * Reducao best-effort de identificadores diretos antes do envio de texto
 * clinico a subprocessadores de IA. Isto e pseudonimizacao, nao anonimizacao.
 * Nunca registre a entrada ou a saida desta funcao em logs.
 */
const PASSES: Array<[RegExp, string]> = [
  [/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, '[e-mail removido]'],
  [/\bhttps?:\/\/\S+/gi, '[link removido]'],
  [/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g, '[identificador removido]'],
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF removido]'],
  [/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[CNPJ removido]'],
  [/\b\d{5}-?\d{3}\b/g, '[CEP removido]'],
  [/\b(rua|av\.?|avenida|alameda|travessa|rodovia|estrada)\s+[^,\n]{2,60}?,?\s*n?[ºo°]?\s*\d{1,6}\b/gi, '[endereço removido]'],
  [/(nascimento|nascido|nascida|\bDN\b|data de nasc\w*)[^.\n]{0,30}?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/gi, '$1 [data de nascimento removida]'],
  [/(\+?55\s*)?\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}\b/g, '[telefone removido]'],
  [/\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dXx]\b/g, '[RG removido]'],
  [/\b(?=[A-Za-z0-9_-]{24,}\b)(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{24,}\b/g, '[token removido]'],
]

export function redactDirectIdentifiers(text: string | undefined | null): string | undefined {
  if (!text) return text ?? undefined
  return PASSES.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text)
}

export function redactKnownPersonName(text: string | undefined, name: string | undefined): string | undefined {
  if (!text || !name?.trim()) return text
  const values = [name.trim(), ...name.trim().split(/\s+/).filter(part => part.length >= 3)]
    .sort((a, b) => b.length - a.length)
  return values.reduce((result, value) => {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return result.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'giu'), '[nome removido]')
  }, text)
}

export function pseudonymizeClinicalText(text: string | undefined | null, patientName?: string): string | undefined {
  return redactKnownPersonName(redactDirectIdentifiers(text), patientName)
}
