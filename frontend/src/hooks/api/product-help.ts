import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type ProductHelpResponse = {
  answer: string
  path?: string
  confidence: 'high' | 'medium' | 'low'
  source: 'gemini' | 'local'
  blocked: boolean
}

export function useProductHelp() {
  return useMutation({
    mutationFn: (question: string) => api
      .post<ProductHelpResponse>('/product-help/ask', { question })
      .then(response => response.data),
  })
}
