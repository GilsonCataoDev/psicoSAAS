export function migratePersistedStorage(
  currentKey: string,
  legacyKey: string,
  sanitize?: (value: string) => string,
): void {
  try {
    const currentValue = window.localStorage.getItem(currentKey)
    if (currentValue) {
      if (sanitize) window.localStorage.setItem(currentKey, sanitize(currentValue))
      return
    }
    const legacyValue = window.localStorage.getItem(legacyKey)
    if (legacyValue) window.localStorage.setItem(currentKey, sanitize ? sanitize(legacyValue) : legacyValue)
  } catch {
    // Storage can be unavailable in private or restricted contexts.
  }
}

export function readPersistedStorage(currentKey: string, legacyKey: string): string | null {
  try {
    return window.localStorage.getItem(currentKey) ?? window.localStorage.getItem(legacyKey)
  } catch {
    return null
  }
}
