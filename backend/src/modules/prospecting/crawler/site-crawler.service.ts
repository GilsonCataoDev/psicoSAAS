import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import { SsrfGuard } from './ssrf-guard'
import { RobotsService } from './robots.service'

const FETCH_TIMEOUT_MS = 8000
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024 // 2MB
const MAX_REDIRECTS = 3
const BLOCKED_DOMAINS = ['linkedin.com', 'psymeetsocial.com', 'psymeet.com.br']
const CRAWL_PATHS = ['/', '/contato', '/contact', '/agendamento', '/agende', '/agendar']

export interface CrawledPage {
  url: string
  html: string
}

/**
 * Acessa somente sites profissionais próprios (nunca LinkedIn/PsyMeet).
 * Respeita robots.txt, limita páginas/domínio, aplica rate-limit entre
 * requisições ao mesmo domínio, bloqueia SSRF a cada hop de redirect,
 * limita tamanho de resposta e só aceita text/html. Sem cookies, sem JS,
 * sem preenchimento de formulários, sem download de documentos.
 */
@Injectable()
export class SiteCrawlerService {
  private readonly logger = new Logger(SiteCrawlerService.name)
  private readonly lastFetchAtByHost = new Map<string, number>()

  constructor(
    private readonly ssrf: SsrfGuard,
    private readonly robots: RobotsService,
  ) {}

  async crawlSite(baseUrl: string): Promise<CrawledPage[]> {
    const origin = this.safeOrigin(baseUrl)
    if (!origin) return []

    if (BLOCKED_DOMAINS.some(domain => origin.hostname.endsWith(domain))) {
      this.logger.warn(`crawl_blocked_domain host=${origin.hostname}`)
      return []
    }

    const maxPages = Number(process.env.PROSPECTING_MAX_PAGES_PER_DOMAIN ?? 3)
    const pages: CrawledPage[] = []

    for (const path of CRAWL_PATHS.slice(0, maxPages)) {
      const pageUrl = new URL(path, origin).toString()
      try {
        const allowed = await this.robots.isAllowed(pageUrl)
        if (!allowed) {
          this.logger.debug(`crawl_skip_robots_disallow url=${pageUrl}`)
          continue
        }
        const page = await this.fetchPage(pageUrl)
        if (page) pages.push(page)
      } catch (err) {
        this.logger.debug(`crawl_page_failed url=${pageUrl} error=${err instanceof Error ? err.message : String(err)}`)
      }
      if (pages.length >= maxPages) break
    }

    return pages
  }

  private async fetchPage(pageUrl: string, redirectsLeft = MAX_REDIRECTS): Promise<CrawledPage | null> {
    await this.respectCrawlDelay(new URL(pageUrl).hostname)
    const safeUrl = await this.ssrf.assertSafeUrl(pageUrl)

    const userAgent = process.env.PROSPECTING_USER_AGENT || 'UseCogniaProspectingBot/1.0'
    const response = await axios.get(safeUrl.toString(), {
      timeout: FETCH_TIMEOUT_MS,
      maxRedirects: 0,
      maxContentLength: MAX_RESPONSE_BYTES,
      maxBodyLength: MAX_RESPONSE_BYTES,
      withCredentials: false,
      headers: { 'User-Agent': userAgent, Accept: 'text/html' },
      validateStatus: status => (status >= 200 && status < 400),
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers?.location as string | undefined
      if (!location || redirectsLeft <= 0) return null
      const nextUrl = new URL(location, safeUrl).toString()
      return this.fetchPage(nextUrl, redirectsLeft - 1)
    }

    const contentType = String(response.headers?.['content-type'] ?? '')
    if (!contentType.includes('text/html')) return null

    return { url: safeUrl.toString(), html: String(response.data).slice(0, MAX_RESPONSE_BYTES) }
  }

  private async respectCrawlDelay(host: string): Promise<void> {
    const delayMs = Number(process.env.PROSPECTING_CRAWL_DELAY_MS ?? 3000)
    const last = this.lastFetchAtByHost.get(host) ?? 0
    const elapsed = Date.now() - last
    if (elapsed < delayMs) {
      await new Promise(resolve => setTimeout(resolve, delayMs - elapsed))
    }
    this.lastFetchAtByHost.set(host, Date.now())
  }

  private safeOrigin(baseUrl: string): URL | null {
    try {
      const url = new URL(baseUrl)
      return new URL(url.origin)
    } catch {
      return null
    }
  }
}
