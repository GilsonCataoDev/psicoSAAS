const SAFE_MESSAGE_STATUSES = new Set([400, 401, 403, 404, 409, 422, 429])

function normalizeMessage(message: unknown): string | null {
  if (Array.isArray(message)) {
    const first = message.find((item) => typeof item === 'string')
    return normalizeMessage(first)
  }

  if (typeof message !== 'string') return null
  const cleaned = message.replace(/\s+/g, ' ').trim()
  if (!cleaned || cleaned.length > 180) return null
  return cleaned
}

export function userSafeError(error: unknown, fallback: string): string {
  const response = (error as { response?: { status?: number; data?: { message?: unknown } } })?.response
  const message = normalizeMessage(response?.data?.message)

  // So repassa mensagens de status esperados; erros 5xx podem conter detalhe interno/PII.
  if (response?.status && SAFE_MESSAGE_STATUSES.has(response.status) && message) return message
  return fallback
}
