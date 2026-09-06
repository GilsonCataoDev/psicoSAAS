import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface CreditCardInput {
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
}

export interface CardHolderInfo {
  name: string
  cpfCnpj: string
  postalCode: string
  addressNumber: string
  phone: string
}

export function useTokenizeCard() {
  return useMutation({
    mutationFn: (data: { creditCard: CreditCardInput; creditCardHolderInfo: CardHolderInfo }) =>
      api.post<{ creditCardToken: string }>('/billing/tokenize', data).then(r => r.data),
  })
}

export function useSubscribeTrial() {
  return useMutation({
    mutationFn: (creditCardToken: string) =>
      api.post('/billing/subscribe', { plan: 'pro', creditCardToken }).then(r => r.data),
  })
}
