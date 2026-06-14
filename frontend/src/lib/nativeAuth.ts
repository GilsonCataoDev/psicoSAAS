import { Capacitor } from '@capacitor/core'

const ACCESS_TOKEN_KEY = 'usecognia.native.accessToken'
const REFRESH_TOKEN_KEY = 'usecognia.native.refreshToken'

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

export function getNativeAccessToken(): string | null {
  if (!isNativeApp()) return null
  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getNativeRefreshToken(): string | null {
  if (!isNativeApp()) return null
  return window.localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setNativeTokens(tokens?: { accessToken?: string; refreshToken?: string } | null): void {
  if (!isNativeApp() || !tokens?.accessToken || !tokens?.refreshToken) return
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
}

export function clearNativeTokens(): void {
  if (!isNativeApp()) return
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
}
