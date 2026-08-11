import { Injectable, Logger } from '@nestjs/common'
import axios, { AxiosInstance } from 'axios'
import { SearchOptions, SearchProvider, SearchResult } from './search-provider.interface'

const ENDPOINT = 'https://www.googleapis.com/customsearch/v1'
const DEFAULT_TIMEOUT_MS = 8000
const MAX_ATTEMPTS = 2
const MAX_RESULTS_PER_REQUEST = 10 // limite da própria API do Google

interface GoogleSearchItem {
  title?: string
  link?: string
  snippet?: string
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[]
  error?: { code?: number; message?: string }
}

/**
 * Provider real via Google Custom Search JSON API — tier gratuito de
 * 100 buscas/dia. Requer duas credenciais criadas manualmente no Google
 * Cloud Console (API key) e no Programmable Search Engine (cx):
 *
 *   PROSPECTING_SEARCH_API_KEY    — API key do Google Cloud Console
 *   PROSPECTING_SEARCH_ENGINE_ID  — "cx" do Programmable Search Engine
 *
 * Selecionado via PROSPECTING_SEARCH_PROVIDER=google.
 */
@Injectable()
export class GoogleCustomSearchProvider implements SearchProvider {
  readonly name = 'google'
  private readonly logger = new Logger(GoogleCustomSearchProvider.name)
  private readonly client: AxiosInstance
  private queryCount = 0
  private resultCount = 0

  constructor() {
    this.client = axios.create({ timeout: DEFAULT_TIMEOUT_MS })
  }

  private get apiKey(): string {
    return process.env.PROSPECTING_SEARCH_API_KEY ?? ''
  }

  private get engineId(): string {
    return process.env.PROSPECTING_SEARCH_ENGINE_ID ?? ''
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.apiKey || !this.engineId) {
      throw new Error('PROSPECTING_SEARCH_API_KEY e PROSPECTING_SEARCH_ENGINE_ID são obrigatórios para o provider google')
    }
    const maxResults = Math.min(options.maxResults ?? 10, MAX_RESULTS_PER_REQUEST)
    let lastError: unknown

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        this.queryCount += 1
        const response = await this.client.get<GoogleSearchResponse>(ENDPOINT, {
          params: {
            key: this.apiKey,
            cx: this.engineId,
            q: query,
            num: maxResults,
          },
        })

        if (response.data.error) {
          throw new Error(`Google Custom Search: ${response.data.error.message ?? 'erro desconhecido'}`)
        }

        const now = new Date()
        const results: SearchResult[] = (response.data.items ?? [])
          .slice(0, maxResults)
          .map((item, index) => ({
            title: item.title ?? '',
            url: item.link ?? '',
            snippet: item.snippet ?? '',
            source: this.name,
            position: index + 1,
            discoveredAt: now,
          }))
          .filter(r => !!r.url)

        this.resultCount += results.length
        this.logger.log(`google_search query_count=${this.queryCount} result_count=${this.resultCount} attempt=${attempt}`)
        return results
      } catch (err) {
        lastError = err
        // 429 = cota diária excedida (100/dia no tier gratuito) — não adianta retentar no mesmo ciclo
        const status = axios.isAxiosError(err) ? err.response?.status : undefined
        this.logger.warn(`google_search_failed attempt=${attempt}/${MAX_ATTEMPTS} status=${status ?? 'n/a'} error=${err instanceof Error ? err.message : String(err)}`)
        if (status === 429) break
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Falha desconhecida no provider Google Custom Search')
  }
}
