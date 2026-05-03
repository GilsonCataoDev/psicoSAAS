export function normalizeBrazilPhone(phone?: string | null): string {
  const digits = phone?.replace(/\D/g, '') ?? ''
  if (!digits) return ''
  return digits.startsWith('55') ? digits : `55${digits}`
}

export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string {
  const normalized = normalizeBrazilPhone(phone)
  const destination = normalized || ''
  return `https://wa.me/${destination}?text=${encodeURIComponent(message)}`
}

export function openWhatsApp(phone: string | null | undefined, message: string): void {
  window.open(buildWhatsAppUrl(phone, message), '_blank', 'noopener,noreferrer')
}
