export function migratePersistedStorage(currentKey: string, legacyKey: string): void {
  try {
    if (window.localStorage.getItem(currentKey)) return
    const legacyValue = window.localStorage.getItem(legacyKey)
    if (legacyValue) window.localStorage.setItem(currentKey, legacyValue)
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
