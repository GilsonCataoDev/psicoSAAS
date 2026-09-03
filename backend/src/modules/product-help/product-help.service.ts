import { Inject, Injectable } from '@nestjs/common'
import { PRODUCT_HELP_AI_CLIENT, type ProductHelpAiClient } from './product-help-ai.client'
import { PRODUCT_HELP_ROUTES, PRODUCT_HELP_TOPICS } from './product-help.catalog'

export type ProductHelpResponse = {
  answer: string
  path?: string
  confidence: 'high' | 'medium' | 'low'
  source: 'gemini' | 'local'
  blocked: boolean
}

const IDENTIFIER_PATTERNS = [
  /\b\d{3}\.\d{3}\.\d{3}-?\d{2}\b/,
  /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i,
  /\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}\b/,
  /\b(?:meu|minha|o|a) paciente [A-ZÀ-Ý][a-zà-ÿ]+(?:\s+[A-ZÀ-Ý][a-zà-ÿ]+){0,3}\b/,
]

const CLINICAL_PATTERNS = [
  /\bdiagn[oó]stic/i,
  /\bcaso cl[ií]nico/i,
  /\btranstorno/i,
  /\bsintoma/i,
  /\bmedica(?:ç|c)[aã]o/i,
  /\bprescrev/i,
  /\bsuic[ií]d/i,
  /\bautomutila/i,
  /\bresultado(?:s)? (?:do|de) teste/i,
]

@Injectable()
export class ProductHelpService {
  constructor(
    @Inject(PRODUCT_HELP_AI_CLIENT) private readonly aiClient: ProductHelpAiClient,
  ) {}

  async ask(rawQuestion: string): Promise<ProductHelpResponse> {
    const question = rawQuestion.trim()
    if (this.containsRestrictedContent(question)) return this.blockedResponse()

    try {
      const result = await this.aiClient.answer(question)
      return {
        answer: result.answer,
        path: this.safePath(result.path),
        confidence: result.confidence,
        source: 'gemini',
        blocked: false,
      }
    } catch {
      return this.localAnswer(question)
    }
  }

  private containsRestrictedContent(question: string): boolean {
    return [...IDENTIFIER_PATTERNS, ...CLINICAL_PATTERNS].some(pattern => pattern.test(question))
  }

  private blockedResponse(): ProductHelpResponse {
    return {
      answer: 'Para proteger a privacidade, não envie dados de pacientes nem conteúdo clínico aqui. Posso ajudar com dúvidas de uso do UseCognia, como agenda, cadastro, documentos ou financeiro.',
      confidence: 'high',
      source: 'local',
      blocked: true,
    }
  }

  private localAnswer(question: string): ProductHelpResponse {
    const normalized = question.toLocaleLowerCase('pt-BR')
    const ranked = PRODUCT_HELP_TOPICS
      .map(topic => ({
        topic,
        score: topic.keywords.filter(keyword => normalized.includes(keyword)).length,
      }))
      .sort((a, b) => b.score - a.score)
    const best = ranked[0]

    if (!best || best.score === 0) {
      return {
        answer: 'Posso explicar como usar pacientes, agenda, sessões, documentos, financeiro, instrumentos, avaliações e ajustes. Tente perguntar, por exemplo: “Como cadastro um paciente?”.',
        confidence: 'low',
        source: 'local',
        blocked: false,
      }
    }

    return {
      answer: best.topic.answer,
      path: best.topic.path,
      confidence: best.score > 1 ? 'high' : 'medium',
      source: 'local',
      blocked: false,
    }
  }

  private safePath(path?: string): string | undefined {
    return PRODUCT_HELP_ROUTES.includes(path as (typeof PRODUCT_HELP_ROUTES)[number]) ? path : undefined
  }
}
