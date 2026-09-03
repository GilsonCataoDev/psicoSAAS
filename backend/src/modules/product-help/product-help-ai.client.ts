export type ProductHelpAiAnswer = {
  answer: string
  path?: string
  confidence: 'high' | 'medium' | 'low'
}

export interface ProductHelpAiClient {
  answer(question: string): Promise<ProductHelpAiAnswer>
}

export const PRODUCT_HELP_AI_CLIENT = Symbol('PRODUCT_HELP_AI_CLIENT')
