import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api, USE_MOCK } from '@/lib/api'
import { track, EVENTS } from '@/lib/analytics'
import { copyText } from '@/lib/utils'

export interface ReferralStats {
  code: string
  totalInvited: number
  totalRewarded: number
  rewardLabel?: string
  criteria?: {
    patients: number
    sessions: number
    daysActive: number
    emailVerified: boolean
  }
  invited?: Array<{
    id: string
    name: string
    rewardGranted: boolean
    progress: {
      patients: number
      sessions: number
      daysActive: number
      emailVerified: boolean
      qualified: boolean
    }
  }>
}

const MOCK_STATS: ReferralStats = {
  code: 'CAROL3X7',
  totalInvited: 3,
  totalRewarded: 1,
  rewardLabel: '30 dias de beneficio',
  criteria: { patients: 3, sessions: 2, daysActive: 3, emailVerified: true },
  invited: [],
}

async function fetchReferralStats(): Promise<ReferralStats> {
  if (USE_MOCK) return MOCK_STATS
  return api.get('/referral').then(response => response.data)
}

export function useReferral(enabled = true) {
  const [copied, setCopied] = useState(false)
  const { data: stats } = useQuery({
    queryKey: ['referral'],
    queryFn: fetchReferralStats,
    enabled,
    staleTime: 5 * 60 * 1000,
  })

  const referralUrl = stats
    ? `${window.location.origin}${import.meta.env.BASE_URL}cadastro?ref=${stats.code}`
    : ''

  async function copyLink() {
    if (!referralUrl) return

    try {
      await copyText(referralUrl)
      setCopied(true)
      track(EVENTS.REFERRAL_COPIED)
      toast.success('Link copiado!')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar automaticamente.')
    }
  }

  function shareWhatsApp() {
    if (!referralUrl) return

    const message = encodeURIComponent(
      `Estou usando o UseCognia para gerenciar meu consultorio e adorando!\n\n` +
      `Crie sua conta gratis com meu link. Quando voce cadastrar 3 pacientes e 2 sessoes, eu ganho 30 dias de beneficio e voce comeca com a rotina organizada: ${referralUrl}`,
    )
    window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener,noreferrer')
    track(EVENTS.REFERRAL_SHARED)
  }

  return { stats, referralUrl, copied, copyLink, shareWhatsApp }
}
