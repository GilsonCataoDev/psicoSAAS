/**
 * Utilitário para validação e verificação de CRP
 *
 * O CFP (Conselho Federal de Psicologia) NÃO oferece API pública.
 * A verificação é feita pelo portal oficial: https://cadastro.cfp.org.br/
 *
 * Formato CRP: XX/XXXXXX  (regiao/numero)
 * Ex: 06/123456 (SP), 01/12345 (DF), 08/12345 (PR)
 */

/** Regiões CRP válidas no Brasil */
export const CRP_REGIONS: Record<string, string> = {
  '01': 'Distrito Federal',
  '02': 'Pernambuco',
  '03': 'Bahia',
  '04': 'Minas Gerais',
  '05': 'Rio de Janeiro',
  '06': 'São Paulo',
  '07': 'Rio Grande do Sul',
  '08': 'Paraná',
  '09': 'Goiás',
  '10': 'Pará e Amapá',
  '11': 'Ceará',
  '12': 'Santa Catarina',
  '13': 'Paraíba',
  '14': 'Mato Grosso do Sul',
  '15': 'Alagoas',
  '16': 'Espírito Santo',
  '17': 'Rio Grande do Norte',
  '18': 'Mato Grosso',
  '19': 'Sergipe',
  '20': 'Amazonas e Roraima',
  '21': 'Piauí',
  '22': 'Maranhão',
  '23': 'Tocantins',
  '24': 'Acre e Rondônia',
}

/** Valida formato do CRP (XX/XXXXXX) */
export function isValidCrpFormat(crp: string): boolean {
  const normalized = crp.trim()
  if (!/^\d{2}\/\d{4,6}$/.test(normalized)) return false
  return !!getCrpRegion(normalized)
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
