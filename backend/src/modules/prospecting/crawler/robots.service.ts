import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import { SsrfGuard } from './ssrf-guard'

interface RobotsRules {
  disallow: string[]
  allow: string[]
  fetchedAt: number
}

const CACHE_TTL_MS = 60 * 60 * 1000 // 1h
const FETCH_TIMEOUT_MS = 5000

/**
 * Busca e interpreta robots.txt de forma simples (regras Disallow/Allow do
 * grupo User-agent: * e do PROSPECTING_USER_AGENT específico, quando presente).
 * Falha fechada: se não for possível buscar/interpretar robots.txt, trata como
 * "não permitido" — mais seguro do que assumir liberação.
 */
@Injectable()
export class RobotsService {
  private readonly logger = new Logger(RobotsService.name)
  private readonly cache = new Map<string, RobotsRules>()

  constructor(private readonly ssrf: SsrfGuard) {}

  async isAllowed(pageUrl: string): Promise<boolean> {
    const url = new URL(pageUrl)
    const rules = await this.getRules(url.origin)
    if (!rules) return false

    const path = url.pathname || '/'
    const matchingAllow = rules.allow.filter(rule => path.startsWith(rule))
    const matchingDisallow = rules.disallow.filter(rule => path.startsWith(rule))

    if (matchingDisallow.length === 0) return true

    const longestDisallow = Math.max(...matchingDisallow.map(r => r.length))
    const longestAllow = matchingAllow.length ? Math.max(...matchingAllow.map(r => r.length)) : -1

    return longestAllow > longestDisallow
  }

  private async getRules(origin: string): Promise<RobotsRules | null> {
    const cached = this.cache.get(origin)
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached

    const robotsUrl = `${origin}/robots.txt`
    try {
      await this.ssrf.assertSafeUrl(robotsUrl)
      const userAgent = process.env.PROSPECTING_USER_AGENT || 'UseCogniaProspectingBot/1.0'
      const response = await axios.get(robotsUrl, {
        timeout: FETCH_TIMEOUT_MS,
        maxRedirects: 2,
        headers: { 'User-Agent': userAgent },
        validateStatus: status => status < 500,
      })

      if (response.status === 404) {
        const rules: RobotsRules = { disallow: [], allow: [], fetchedAt: Date.now() }
        this.cache.set(origin, rules)
        return rules
      }
      if (response.status >= 400) return null

      const rules = this.parse(String(response.data), userAgent)
      this.cache.set(origin, rules)
      return rules
    } catch (err) {
      this.logger.warn(`robots_fetch_failed origin=${origin} error=${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }

  private parse(body: string, userAgent: string): RobotsRules {
    const lines = body.split(/\r?\n/).map(l => l.trim())
    const groups: Array<{ agents: string[]; disallow: string[]; allow: string[] }> = []
    let current: { agents: string[]; disallow: string[]; allow: string[] } | null = null

    for (const line of lines) {
      if (!line || line.startsWith('#')) continue
      const [rawKey, ...rest] = line.split(':')
      const key = rawKey.trim().toLowerCase()
      const value = rest.join(':').trim()

      if (key === 'user-agent') {
        if (!current || current.disallow.length || current.allow.length) {
          current = { agents: [value.toLowerCase()], disallow: [], allow: [] }
          groups.push(current)
        } else {
          current.agents.push(value.toLowerCase())
        }
      } else if (key === 'disallow' && current) {
        if (value) current.disallow.push(value)
      } else if (key === 'allow' && current) {
        if (value) current.allow.push(value)
      }
    }

    const agentToken = userAgent.split('/')[0].toLowerCase()
    const specific = groups.find(g => g.agents.some(a => agentToken.includes(a) || a.includes(agentToken)))
    const wildcard = groups.find(g => g.agents.includes('*'))
    const chosen = specific ?? wildcard

    return { disallow: chosen?.disallow ?? [], allow: chosen?.allow ?? [], fetchedAt: Date.now() }
  }
}
