import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { FinancialRecord } from '@/types'

export function useFinancial(params?: { patientId?: string; status?: string }) {
  return useQuery<FinancialRecord[]>({
    queryKey: ['financial', params],
    queryFn: () => api.get('/financial', { params }).then(r => r.data),
  })
}

export function useCreateFinancial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<FinancialRecord>) => api.post('/financial', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financial'] }),
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
