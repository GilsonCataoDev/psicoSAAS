import { FactoryProvider } from '@nestjs/common'
import { SEARCH_PROVIDER, SearchProvider } from './search-provider.interface'
import { MockSearchProvider } from './mock-search.provider'
import { GenericHttpSearchProvider } from './generic-http-search.provider'
import { GoogleCustomSearchProvider } from './google-custom-search.provider'
import { TavilySearchProvider } from './tavily-search.provider'

/**
 * Escolhe a implementação de SearchProvider por PROSPECTING_SEARCH_PROVIDER
 * (mock | http | google | tavily), seguindo o padrão de seleção-por-env já usado em ai.service.ts.
 * Default é "mock" — nunca falha o boot por falta de credencial externa.
 * "google" fica mantido por compatibilidade, mas o Google descontinuou a
 * busca gratuita em toda a web em mar/2026 — "tavily" é a opção recomendada
 * hoje (ver docs/PROSPECTING_RADAR.md).
 */
export const searchProviderFactory: FactoryProvider<SearchProvider> = {
  provide: SEARCH_PROVIDER,
  useFactory: (
    mock: MockSearchProvider,
    http: GenericHttpSearchProvider,
    google: GoogleCustomSearchProvider,
    tavily: TavilySearchProvider,
  ): SearchProvider => {
    const provider = (process.env.PROSPECTING_SEARCH_PROVIDER ?? 'mock').toLowerCase()
    if (provider === 'http') return http
    if (provider === 'google') return google
    if (provider === 'tavily') return tavily
    return mock
  },
  inject: [MockSearchProvider, GenericHttpSearchProvider, GoogleCustomSearchProvider, TavilySearchProvider],
}
