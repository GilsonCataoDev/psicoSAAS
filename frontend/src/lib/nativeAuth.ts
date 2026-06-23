import { Capacitor } from '@capacitor/core'

const ACCESS_TOKEN_KEY = 'usecognia.native.accessToken'
const REFRESH_TOKEN_KEY = 'usecognia.native.refreshToken'

async function getSecureStorage() {
  const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin')
  return SecureStoragePlugin
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

export async function getNativeAccessToken(): Promise<string | null> {
  if (!isNativeApp()) return null
  try {
    const SecureStoragePlugin = await getSecureStorage()
    const { value } = await SecureStoragePlugin.get({ key: ACCESS_TOKEN_KEY })
    return value
  } catch {
    return null
  }
}

export async function getNativeRefreshToken(): Promise<string | null> {
  if (!isNativeApp()) return null
  try {
    const SecureStoragePlugin = await getSecureStorage()
    const { value } = await SecureStoragePlugin.get({ key: REFRESH_TOKEN_KEY })
    return value
  } catch {
    return null
  }
}

export async function setNativeTokens(tokens?: { accessToken?: string; refreshToken?: string } | null): Promise<void> {
  if (!isNativeApp() || !tokens?.accessToken || !tokens?.refreshToken) return
  const SecureStoragePlugin = await getSecureStorage()
  await Promise.all([
    SecureStoragePlugin.set({ key: ACCESS_TOKEN_KEY, value: tokens.accessToken }),
    SecureStoragePlugin.set({ key: REFRESH_TOKEN_KEY, value: tokens.refreshToken }), // Keychain/Keystore, nao Preferences
  ])
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export async function clearNativeTokens(): Promise<void> {
  if (!isNativeApp()) return
  const SecureStoragePlugin = await getSecureStorage()
  await Promise.all([
    SecureStoragePlugin.remove({ key: ACCESS_TOKEN_KEY }).catch(() => undefined),
    SecureStoragePlugin.remove({ key: REFRESH_TOKEN_KEY }).catch(() => undefined),
  ])
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
}
