export type ProductHelpAiAnswer = {
  answer: string
  path?: string
  confidence: 'high' | 'medium' | 'low'
}

export type ConversationTurn = { role: 'user' | 'model'; text: string }

export interface ProductHelpAiClient {
  answer(question: string, history?: ConversationTurn[]): Promise<ProductHelpAiAnswer>
}

export const PRODUCT_HELP_AI_CLIENT = Symbol('PRODUCT_HELP_AI_CLIENT')
