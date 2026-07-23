import { Injectable, Logger } from '@nestjs/common'
import { SearchOptions, SearchProvider, SearchResult } from './search-provider.interface'

/**
 * Provider determinístico para desenvolvimento e testes — não faz nenhuma
 * chamada de rede. Gera resultados sintéticos plausíveis a partir da query,
 * cobrindo os três tipos de fonte suportados (site próprio, LinkedIn indexado,
 * PsyMeet indexado) para exercitar o pipeline completo sem depender de uma
 * API de busca real.
 */
@Injectable()
export class MockSearchProvider implements SearchProvider {
  readonly name = 'mock'
  private readonly logger = new Logger(MockSearchProvider.name)
  private queryCount = 0

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    this.queryCount += 1
    const maxResults = options.maxResults ?? 10
    const now = new Date()
    const slug = this.slugify(query)

    const candidates: SearchResult[] = []

    if (/site:linkedin\.com\/in/i.test(query)) {
      candidates.push({
        title: `${this.titleCase(slug)} — Psicóloga(o) Clínica | LinkedIn`,
        url: `https://www.linkedin.com/in/${slug}-psicologia`,
        snippet: 'Psicóloga clínica autônoma. Atendimento particular, agenda própria via WhatsApp.',
        source: 'linkedin_search',
        position: 1,
        discoveredAt: now,
      })
    } else if (/site:psymeetsocial\.com|site:psymeet\.com\.br/i.test(query)) {
      candidates.push({
        title: `Perfil de ${this.titleCase(slug)} no PsyMeet`,
        url: `https://psymeetsocial.com/perfil/${slug}`,
        snippet: 'Psicóloga(o) com abordagem TCC, atendimento online, disponível para novos pacientes.',
        source: 'psymeet_search',
        position: 1,
        discoveredAt: now,
      })
    } else {
      candidates.push({
        title: `${this.titleCase(slug)} - Psicóloga Clínica`,
        url: `https://${slug}.com.br`,
        snippet: 'Consultório particular. Agendamento pelo WhatsApp. Entre em contato para agendar sua consulta.',
        source: 'own_site',
        position: 1,
        discoveredAt: now,
      })
    }

    const results = candidates.slice(0, maxResults)
    this.logger.debug(`mock_search query_count=${this.queryCount} results=${results.length}`)
    return results
  }

  private slugify(query: string): string {
    const cleaned = query
      .replace(/site:\S+/gi, '')
      .replace(/["']/g, '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    return cleaned || 'psicologa-exemplo'
  }

  private titleCase(slug: string): string {
    return slug.split('-').slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
}
