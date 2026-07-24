import { Injectable, Logger } from '@nestjs/common'
import axios, { AxiosInstance } from 'axios'
import { SearchOptions, SearchProvider, SearchResult } from './search-provider.interface'

const ENDPOINT = 'https://api.tavily.com/search'
const DEFAULT_TIMEOUT_MS = 8000
const MAX_ATTEMPTS = 2
const MAX_RESULTS_PER_REQUEST = 20 // limite prático da própria API do Tavily

interface TavilySearchResultItem {
  title?: string
  url?: string
  content?: string
}

interface TavilySearchResponse {
  results?: TavilySearchResultItem[]
}

/**
 * Provider real via Tavily Search API — tier gratuito de 1.000 créditos/mês
 * (1 crédito por busca básica), sem cartão de crédito exigido no cadastro.
 * Substitui o Google Custom Search como opção padrão desde que o Google
 * descontinuou a busca gratuita em toda a web (mar/2026, ver
 * docs/PROSPECTING_RADAR.md). Requer:
 *
 *   PROSPECTING_SEARCH_API_KEY — API key gerada em app.tavily.com
 *
 * Selecionado via PROSPECTING_SEARCH_PROVIDER=tavily.
 */
@Injectable()
export class TavilySearchProvider implements SearchProvider {
  readonly name = 'tavily'
  private readonly logger = new Logger(TavilySearchProvider.name)
  private readonly client: AxiosInstance
  private queryCount = 0
  private resultCount = 0

  constructor() {
    this.client = axios.create({ timeout: DEFAULT_TIMEOUT_MS })
  }

  private get apiKey(): string {
    return process.env.PROSPECTING_SEARCH_API_KEY ?? ''
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.apiKey) {
      throw new Error('PROSPECTING_SEARCH_API_KEY é obrigatório para o provider tavily')
    }
    const maxResults = Math.min(options.maxResults ?? 10, MAX_RESULTS_PER_REQUEST)
    let lastError: unknown

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        this.queryCount += 1
        const response = await this.client.post<TavilySearchResponse>(
          ENDPOINT,
          { query, max_results: maxResults },
          { headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' } },
        )

        const now = new Date()
        const results: SearchResult[] = (response.data.results ?? [])
          .slice(0, maxResults)
          .map((item, index) => ({
            title: item.title ?? '',
            url: item.url ?? '',
            snippet: item.content ?? '',
            source: this.name,
            position: index + 1,
            discoveredAt: now,
          }))
          .filter(r => !!r.url)

        this.resultCount += results.length
        this.logger.log(`tavily_search query_count=${this.queryCount} result_count=${this.resultCount} attempt=${attempt}`)
        return results
      } catch (err) {
        lastError = err
        // 429/432 = cota mensal excedida — não adianta retentar no mesmo ciclo
        const status = axios.isAxiosError(err) ? err.response?.status : undefined
        this.logger.warn(`tavily_search_failed attempt=${attempt}/${MAX_ATTEMPTS} status=${status ?? 'n/a'} error=${err instanceof Error ? err.message : String(err)}`)
        if (status === 429 || status === 432) break
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Falha desconhecida no provider Tavily')
  }
}
