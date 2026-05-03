import axios, { AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/auth'

export const USE_MOCK = false

export const api = axios.create({
  baseURL:         import.meta.env.VITE_API_URL || 'https://psicosaas-production-2d6c.up.railway.app/api',
  headers:         { 'Content-Type': 'application/json' },
  withCredentials: true,  // envia cookies HttpOnly em toda requisição
})

// ── CSRF: adiciona X-CSRF-Token em todas as mutações ──────────────────────────
api.interceptors.request.use(config => {
  const csrfToken = useAuthStore.getState().csrfToken
  if (
    csrfToken &&
    config.method &&
    !['get', 'head', 'options'].includes(config.method.toLowerCase())
  ) {
    config.headers['X-CSRF-Token'] = csrfToken
  }
  return config
})

// ── Refresh Token: 401 → tenta renovar → retenta a request original ───────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject:  (reason: unknown) => void
}> = []

function processQueue(error: unknown): void {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(null))
  failedQueue = []
}

function redirectToLogin(): void {
  useAuthStore.getState().logout()
  window.location.href = `${import.meta.env.BASE_URL}#/login`
}

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config as AxiosRequestConfig & { _retry?: boolean }

    // Não é 401 — propaga normalmente
    if (err.response?.status !== 401) return Promise.reject(err)

    // O próprio /auth/refresh retornou 401 → sessão perdida, redireciona
    if (original.url?.includes('/auth/refresh')) {
      redirectToLogin()
      return Promise.reject(err)
    }

    // Já foi reentado → evita loop infinito
    if (original._retry) {
      redirectToLogin()
      return Promise.reject(err)
    }

    original._retry = true

    // Outro request já está renovando → enfileira e aguarda
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(() => api(original))
    }

    isRefreshing = true

    try {
      // Renova tokens via cookie (sem precisar de body)
      const { data } = await api.post('/auth/refresh')

      // Atualiza csrfToken no store com o novo valor
      if (data.csrfToken) {
        useAuthStore.getState().setCsrfToken(data.csrfToken)
      }
      if (data.user) {
        useAuthStore.getState().setAuth(data.user)
      }

      processQueue(null)
      return api(original)           // retenta a request original

    } catch (refreshErr) {
      processQueue(refreshErr)
      redirectToLogin()
      return Promise.reject(refreshErr)

    } finally {
      isRefreshing = false
    }
  },
)
