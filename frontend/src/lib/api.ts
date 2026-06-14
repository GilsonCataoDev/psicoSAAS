import axios, { AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/auth'
import {
  clearNativeTokens,
  getNativeAccessToken,
  getNativeRefreshToken,
  isNativeApp,
  setNativeTokens,
} from '@/lib/nativeAuth'

export const USE_MOCK = false

export type AuthAxiosRequestConfig = AxiosRequestConfig & {
  _retry?: boolean
  skipAuthRedirect?: boolean
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://usecognia.com.br/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

api.interceptors.request.use(config => {
  const csrfToken = useAuthStore.getState().csrfToken
  if (isNativeApp()) {
    config.headers['X-UseCognia-Client'] = 'native'

    const accessToken = getNativeAccessToken()
    if (accessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    const refreshToken = getNativeRefreshToken()
    if (refreshToken && config.url?.includes('/auth/refresh')) {
      config.headers['X-Refresh-Token'] = refreshToken
    }
  }

  if (
    csrfToken &&
    config.method &&
    !['get', 'head', 'options'].includes(config.method.toLowerCase())
  ) {
    config.headers['X-CSRF-Token'] = csrfToken
  }
  return config
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}> = []

function processQueue(error: unknown): void {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(null))
  failedQueue = []
}

function redirectToLogin(): void {
  useAuthStore.getState().logout()
  clearNativeTokens()
  window.location.href = `${import.meta.env.BASE_URL}#/login`
}

function isAuthPublicEndpoint(url?: string): boolean {
  return [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
  ].some(endpoint => url?.includes(endpoint))
}

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config as AuthAxiosRequestConfig

    if (err.response?.status !== 401) return Promise.reject(err)

    if (original.skipAuthRedirect) {
      return Promise.reject(err)
    }

    if (isAuthPublicEndpoint(original.url)) {
      return Promise.reject(err)
    }

    if (original.url?.includes('/auth/refresh')) {
      redirectToLogin()
      return Promise.reject(err)
    }

    if (original._retry) {
      redirectToLogin()
      return Promise.reject(err)
    }

    original._retry = true

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(() => api(original))
    }

    isRefreshing = true

    try {
      const { data } = await api.post('/auth/refresh')

      if (data.csrfToken) {
        useAuthStore.getState().setCsrfToken(data.csrfToken)
      }
      if (data.tokens) {
        setNativeTokens(data.tokens)
      }
      if (data.user) {
        useAuthStore.getState().setAuth(data.user)
      }

      processQueue(null)
      return api(original)
    } catch (refreshErr) {
      processQueue(refreshErr)
      redirectToLogin()
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  },
)
