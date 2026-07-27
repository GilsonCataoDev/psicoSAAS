export function safeInternalPath(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const path = value.trim()
  if (!path.startsWith('/') || path.startsWith('//')) return null
  const hasControlCharacter = [...path].some(character => {
    const code = character.charCodeAt(0)
    return code < 32 || code === 127
  })
  if (path.includes('\\') || /%5c/i.test(path) || hasControlCharacter) return null

  try {
    const parsed = new URL(path, window.location.origin)
    if (parsed.origin !== window.location.origin) return null
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return null
  }
}
