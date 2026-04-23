import axios from 'axios'
import { useAuthStore } from '@/store/auth'

// Modo mock: usa dados locais sem backend real
// Em produção: VITE_USE_MOCK=false no .env
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // envia HttpOnly cookie em toda requisição
})

// Sem token no header — autenticação via HttpOnly cookie (mais seguro contra XSS)
api.interceptors.request.use((config) => config)

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)
