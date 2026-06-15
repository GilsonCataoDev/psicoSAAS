import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const ACCESS_TOKEN_KEY = 'usecognia.native.accessToken'
const REFRESH_TOKEN_KEY = 'usecognia.native.refreshToken'

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

export async function getNativeAccessToken(): Promise<string | null> {
  if (!isNativeApp()) return null
  const { value } = await Preferences.get({ key: ACCESS_TOKEN_KEY })
  return value
}

export async function getNativeRefreshToken(): Promise<string | null> {
  if (!isNativeApp()) return null
  const { value } = await Preferences.get({ key: REFRESH_TOKEN_KEY })
  return value
}

export async function setNativeTokens(tokens?: { accessToken?: string; refreshToken?: string } | null): Promise<void> {
  if (!isNativeApp() || !tokens?.accessToken || !tokens?.refreshToken) return
  await Promise.all([
    Preferences.set({ key: ACCESS_TOKEN_KEY, value: tokens.accessToken }),
    Preferences.set({ key: REFRESH_TOKEN_KEY, value: tokens.refreshToken }),
  ])
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export async function clearNativeTokens(): Promise<void> {
  if (!isNativeApp()) return
  await Promise.all([
    Preferences.remove({ key: ACCESS_TOKEN_KEY }),
    Preferences.remove({ key: REFRESH_TOKEN_KEY }),
  ])
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
}
