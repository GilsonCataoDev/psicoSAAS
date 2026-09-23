import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type ProductHelpResponse = {
  answer: string
  path?: string
  confidence: 'high' | 'medium' | 'low'
  source: 'gemini' | 'local'
  blocked: boolean
}

export type ConversationTurn = { role: 'user' | 'model'; text: string }

export function useProductHelp() {
  return useMutation({
    mutationFn: ({ question, history }: { question: string; history?: ConversationTurn[] }) =>
      api.post<ProductHelpResponse>('/product-help/ask', { question, history }).then(r => r.data),
  })
}
