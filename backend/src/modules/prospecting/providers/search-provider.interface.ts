export interface SearchResult {
  title: string
  url: string
  snippet: string
  source: string
  position: number
  discoveredAt: Date
}

export interface SearchOptions {
  maxResults?: number
}

export const SEARCH_PROVIDER = Symbol('SEARCH_PROVIDER')

export interface SearchProvider {
  readonly name: string
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>
}
