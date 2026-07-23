import { Injectable, Logger } from '@nestjs/common'
import axios, { AxiosInstance } from 'axios'
import { SearchOptions, SearchProvider, SearchResult } from './search-provider.interface'

const DEFAULT_TIMEOUT_MS = 8000
const MAX_ATTEMPTS = 2

interface RawSearchItem {
  title?: string
  url?: string
  link?: string
  snippet?: string
  description?: string
}

/**
 * Provider real, desacoplado de um fornecedor específico. Espera uma API de
 * busca web autorizada acessível via GET, configurada inteiramente por env
 * (PROSPECTING_SEARCH_BASE_URL + PROSPECTING_SEARCH_API_KEY), retornando um
 * JSON com um array de resultados em `results` ou `items` (title/url/snippet).
 * Para um provedor cujo payload não siga esse formato, adapte `parseResponse`.
 */
@Injectable()
export class GenericHttpSearchProvider implements SearchProvider {
  readonly name = 'http'
  private readonly logger = new Logger(GenericHttpSearchProvider.name)
  private readonly client: AxiosInstance
  private queryCount = 0
  private resultCount = 0

  constructor() {
    this.client = axios.create({
      timeout: DEFAULT_TIMEOUT_MS,
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : undefined,
    })
  }

  private get baseUrl(): string {
    return process.env.PROSPECTING_SEARCH_BASE_URL ?? ''
  }

  private get apiKey(): string {
    return process.env.PROSPECTING_SEARCH_API_KEY ?? ''
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.baseUrl) {
      throw new Error('PROSPECTING_SEARCH_BASE_URL não configurado para o provider http')
    }
    const maxResults = options.maxResults ?? 10
    let lastError: unknown

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        this.queryCount += 1
        const response = await this.client.get(this.baseUrl, {
          params: { q: query, count: maxResults },
        })
        const items = this.parseResponse(response.data)
        const now = new Date()
        const results: SearchResult[] = items.slice(0, maxResults).map((item, index) => ({
          title: item.title ?? '',
          url: item.url ?? item.link ?? '',
          snippet: item.snippet ?? item.description ?? '',
          source: this.name,
          position: index + 1,
          discoveredAt: now,
        })).filter(r => !!r.url)

        this.resultCount += results.length
        this.logger.log(`http_search query_count=${this.queryCount} result_count=${this.resultCount} attempt=${attempt}`)
        return results
      } catch (err) {
        lastError = err
        this.logger.warn(`http_search_failed attempt=${attempt}/${MAX_ATTEMPTS} error=${err instanceof Error ? err.message : String(err)}`)
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Falha desconhecida no provider de busca')
  }

  private parseResponse(data: unknown): RawSearchItem[] {
    if (Array.isArray(data)) return data as RawSearchItem[]
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>
      if (Array.isArray(obj.results)) return obj.results as RawSearchItem[]
      if (Array.isArray(obj.items)) return obj.items as RawSearchItem[]
    }
    return []
  }
}
