import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { FinancialRecord } from '@/types'

export function useFinancial(params?: { patientId?: string; status?: string }) {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<FinancialRecord[]>({
    queryKey: ['financial', userId, params],
    queryFn: () => api.get('/financial', { params }).then(r => r.data),
    enabled: !!userId,
  })
}

export function useCreateFinancial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<FinancialRecord>) => api.post('/financial', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useMarkFinancialPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, method }: { id: string; method: string }) =>
      api.patch(`/financial/${id}/pay`, { method }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useSendCharge() {
  return useMutation({
    mutationFn: (id: string) => api.post(`/financial/${id}/send-charge`).then(r => r.data),
  })
}

export function useFinancialReport() {
  return useMutation({
    mutationFn: (month: string) => api.get('/financial/report', { params: { month } }).then(r => r.data),
  })
}

export function useDeleteFinancial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/financial/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export type RecurringExpense = {
  id: string
  description: string
  amount: number
  category?: string
  dayOfMonth: number
  active: boolean
  lastGeneratedMonth?: string
  createdAt: string
}

export function useRecurringExpenses() {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<RecurringExpense[]>({
    queryKey: ['recurring-expenses', userId],
    queryFn: () => api.get('/financial/recurring-expenses').then(r => r.data),
    enabled: !!userId,
  })
}

export function useCreateRecurringExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { description: string; amount: number; category?: string; dayOfMonth: number }) =>
      api.post('/financial/recurring-expenses', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring-expenses'] }),
  })
}

export function useSetRecurringExpenseActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/financial/recurring-expenses/${id}`, { active }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring-expenses'] }),
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erro ao atualizar despesa recorrente. Tente novamente.'),
  })
}

export function useDeleteRecurringExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/financial/recurring-expenses/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring-expenses'] }),
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erro ao remover despesa recorrente. Tente novamente.'),
  })
}
