export function isMeaningfulAutomatedMessage(text: string): boolean {
  const normalized = String(text ?? '').trim()
  return normalized.length >= 8 && /[A-Za-zÀ-ÿ]{3}/.test(normalized)
}

export type BookingConfirmationInput = {
  patientName?: string | null
  date?: string | null
  time?: string | null
  modality?: string | null
}

export type BookingConfirmationPage = {
  confirmationMessage?: string | null
  psychologistName?: string | null
  psychologist?: {
    name?: string | null
    preferences?: {
      confirmationTemplate?: string | null
    } | null
  } | null
}

export function renderBookingConfirmationMessage(
  booking: BookingConfirmationInput,
  page?: BookingConfirmationPage | null,
): string | null {
  const prefs = page?.psychologist?.preferences
  const pageTemplate = String(page?.confirmationMessage ?? '').trim()
  const template = pageTemplate || String(prefs?.confirmationTemplate ?? '').trim()
  if (!template) return null

  const firstName = String(booking.patientName ?? '').split(' ')[0] ?? ''
  const time = String(booking.time ?? '').slice(0, 5)
  const modality = booking.modality === 'presencial'
    ? 'presencial'
    : booking.modality === 'online'
      ? 'online'
      : ''

  const rendered = template
    .replace(/{{\s*nome\s*}}/gi, String(booking.patientName ?? ''))
    .replace(/{{\s*primeiro_nome\s*}}/gi, firstName)
    .replace(/{{\s*data\s*}}/gi, String(booking.date ?? ''))
    .replace(/{{\s*hora\s*}}/gi, time)
    .replace(/{{\s*profissional\s*}}/gi, String(page?.psychologist?.name ?? page?.psychologistName ?? ''))
    .replace(/{{\s*modalidade\s*}}/gi, modality)

  return isMeaningfulAutomatedMessage(rendered) ? rendered : null
}

export function renderPaymentTemplate(
  template: string,
  patientName: string,
  amount: number,
  pixKey?: string,
  includeReceipt?: boolean,
): string {
  const receiptMessage = includeReceipt ? 'Pode me enviar o comprovante por aqui depois do pagamento.' : ''
  // Se não há chave PIX, remove a linha inteira em vez de deixar label vazio
  const templateWithPix = pixKey
    ? template.replaceAll('{{pix}}', pixKey)
    : template.replace(/[^\n]*\{\{pix\}\}[^\n]*\n?/g, '')
  const rendered = templateWithPix
    .replaceAll('{{nome}}', patientName.split(' ')[0] || patientName)
    .replaceAll('{{valor}}', `R$ ${amount.toFixed(2)}`)
    .replaceAll('{{comprovante}}', receiptMessage)
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (includeReceipt && !template.includes('{{comprovante}}')) {
    return `${rendered}\n\n${receiptMessage}`
  }
  return rendered
}

export function renderReminderTemplate(
  template: string,
  patientName: string,
  dateLabel: string,
  time: string,
  lead: '24h' | '1h',
): string {
  const rendered = template
    .replaceAll('{{nome}}', patientName.split(' ')[0] || patientName)
    .replaceAll('{{data}}', dateLabel)
    .replaceAll('{{hora}}', time)
    .replaceAll('{{antecedencia}}', lead)

  if (lead !== '1h' || !/\bhoje\b/i.test(rendered)) return rendered

  return rendered
    .replace(/\b(?:e|é)\s+hoje\b/giu, `acontece em ${dateLabel}`)
    .replace(/\bhoje\b/giu, dateLabel)
}
