import { FactoryProvider } from '@nestjs/common'
import { SEARCH_PROVIDER, SearchProvider } from './search-provider.interface'
import { MockSearchProvider } from './mock-search.provider'
import { GenericHttpSearchProvider } from './generic-http-search.provider'
import { GoogleCustomSearchProvider } from './google-custom-search.provider'

/**
 * Escolhe a implementação de SearchProvider por PROSPECTING_SEARCH_PROVIDER
 * (mock | http | google), seguindo o padrão de seleção-por-env já usado em ai.service.ts.
 * Default é "mock" — nunca falha o boot por falta de credencial externa.
 */
export const searchProviderFactory: FactoryProvider<SearchProvider> = {
  provide: SEARCH_PROVIDER,
  useFactory: (
    mock: MockSearchProvider,
    http: GenericHttpSearchProvider,
    google: GoogleCustomSearchProvider,
  ): SearchProvider => {
    const provider = (process.env.PROSPECTING_SEARCH_PROVIDER ?? 'mock').toLowerCase()
    if (provider === 'http') return http
    if (provider === 'google') return google
    return mock
  },
  inject: [MockSearchProvider, GenericHttpSearchProvider, GoogleCustomSearchProvider],
}
