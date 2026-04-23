/**
 * Utilitário para validação e verificação de CRP
 *
 * O CFP (Conselho Federal de Psicologia) NÃO oferece API pública.
 * A verificação é feita pelo portal oficial: https://cadastro.cfp.org.br/
 *
 * Formato CRP: XX/XXXXXX  (region/number)
 * Ex: 06/123456 (SP), 01/12345 (DF), 08/12345 (RS)
 */

/** Regiões CRP válidas no Brasil */
export const CRP_REGIONS: Record<string, string> = {
  '01': 'Distrito Federal e Tocantins',
  '02': 'Minas Gerais',
  '03': 'São Paulo — Interior',
  '04': 'Minas Gerais — Sul/Sudoeste',
  '05': 'Rio de Janeiro',
  '06': 'São Paulo — Capital',
  '07': 'Rio Grande do Sul',
  '08': 'Paraná',
  '09': 'Mato Grosso e Mato Grosso do Sul',
  '10': 'Pará e Amapá',
  '11': 'Ceará',
  '12': 'Pernambuco',
  '13': 'Bahia',
  '14': 'Maranhão e Piauí',
  '15': 'Rio Grande do Norte',
  '16': 'Amazonas, Acre, Rondônia e Roraima',
  '17': 'Espírito Santo',
  '18': 'Goiás',
  '19': 'Sergipe e Alagoas',
  '20': 'Santa Catarina',
  '21': 'Paraíba',
}

/** Valida formato do CRP (XX/XXXXXX) */
export function isValidCrpFormat(crp: string): boolean {
  return /^\d{2}\/\d{4,6}$/.test(crp.trim())
}

/** Retorna a região do CRP, ou null se inválido */
export function getCrpRegion(crp: string): string | null {
  const match = crp.trim().match(/^(\d{2})\//)
  if (!match) return null
  return CRP_REGIONS[match[1]] ?? null
}

/** Abre o portal oficial do CFP para verificação manual */
export function openCfpVerification() {
  window.open('https://cadastro.cfp.org.br/', '_blank', 'noopener,noreferrer')
}

/** Formata o CRP enquanto o usuário digita */
export function formatCrpInput(value: string): string {
  // Remove tudo que não for dígito ou barra
  const digits = value.replace(/[^\d]/g, '')

  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2, 8)}`
}
