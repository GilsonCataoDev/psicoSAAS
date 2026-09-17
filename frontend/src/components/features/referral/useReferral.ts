import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api, USE_MOCK } from '@/lib/api'
import { track, EVENTS } from '@/lib/analytics'
import { copyText } from '@/lib/utils'

export type ReferralStatus = 'captured' | 'validating' | 'payable' | 'paid' | 'refunded' | 'chargeback' | 'ineligible'

export interface ReferralStats {
  code: string
  commissionAmount: number
  validationDays: number
  termsVersion: string
  termsText: string
  totalInvited: number
  totalPending: number
  totalPayable: number
  totalPaid: number
  pendingAmount: number
  payableAmount: number
  paidAmount: number
  payoutProfile: { configured: boolean; pixKeyType?: string; pixKeyMasked?: string; termsVersion?: string }
  invited: Array<{
    id: string
    name: string
    createdAt: string
    status: ReferralStatus
    commissionAmount: number | null
    commissionAvailableAt?: string | null
    commissionPaidAt?: string | null
  }>
}

const MOCK_STATS: ReferralStats = {
  code: 'CAROL', commissionAmount: 48.95, validationDays: 30, termsVersion: '2026-09-17',
  termsText: 'Comissão única de até R$ 48,95 sobre o primeiro pagamento aprovado; liberação após 30 dias sem estorno ou chargeback; pagamento mensal por Pix; autoindicação, contas duplicadas, fraude e publicidade enganosa não são elegíveis.',
  totalInvited: 3, totalPending: 1, totalPayable: 1, totalPaid: 1,
  pendingAmount: 48.95, payableAmount: 48.95, paidAmount: 48.95,
  payoutProfile: { configured: false }, invited: [],
}

async function fetchReferralStats(): Promise<ReferralStats> {
  if (USE_MOCK) return MOCK_STATS
  return api.get('/referral').then(response => response.data)
}

export function useReferral(enabled = true) {
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const { data: stats } = useQuery({
    queryKey: ['referral'], queryFn: fetchReferralStats, enabled, staleTime: 5 * 60 * 1000,
  })
  const savePayout = useMutation({
    mutationFn: (payload: { pixKeyType: string; pixKey: string; taxpayerId: string; acceptedTerms: true }) =>
      api.patch('/referral/payout-profile', payload).then(response => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral'] })
      toast.success('Dados para pagamento salvos.')
    },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Não foi possível salvar os dados.'),
  })

  const referralUrl = stats ? `${window.location.origin}${import.meta.env.BASE_URL}cadastro?ref=${stats.code}` : ''

  async function copyLink() {
    if (!referralUrl) return
    try {
      await copyText(referralUrl)
      setCopied(true)
      track(EVENTS.REFERRAL_COPIED)
      toast.success('Link copiado!')
      window.setTimeout(() => setCopied(false), 2000)
    } catch { toast.error('Não foi possível copiar automaticamente.') }
  }

  function shareWhatsApp() {
    if (!referralUrl) return
    const message = encodeURIComponent(
      `Conheça o UseCognia, uma plataforma para organizar atendimentos, agenda, registros e financeiro. ` +
      `Você pode testar o plano Pro por 7 dias: ${referralUrl}`,
    )
    window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener,noreferrer')
    track(EVENTS.REFERRAL_SHARED)
  }

  return { stats, referralUrl, copied, copyLink, shareWhatsApp, savePayout }
}
