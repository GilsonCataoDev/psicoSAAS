import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Not, Repository } from 'typeorm'
import { createHash } from 'crypto'
import { Prospect, ProspectStatus } from './entities/prospect.entity'
import { ProspectSignal } from './entities/prospect-signal.entity'
import { ProspectActivity, ProspectActivityAction } from './entities/prospect-activity.entity'
import { ProspectingSearch } from './entities/prospecting-search.entity'
import { ProspectConversation } from './entities/prospect-conversation.entity'
import { ProspectMessage } from './entities/prospect-message.entity'
import { QueryBuilderService } from './query-builder/query-builder.service'
import { SEARCH_PROVIDER, SearchProvider, SearchResult } from './providers/search-provider.interface'
import { DedupeService, normalizeDomain, normalizeEmail, normalizePhone } from './dedup/dedupe.service'
import { SiteCrawlerService } from './crawler/site-crawler.service'
import { detectSignals } from './scoring/signal-detectors'
import { ScoringService } from './scoring/scoring.service'
import { DraftService, describeSource, pickMention } from './draft/draft.service'
import { CreateSearchDto, PreviewSearchDto } from './dto/create-search.dto'
import { SuggestReplyDto } from './dto/suggest-reply.dto'
import { AnalyzeSalesConversationDto } from './dto/analyze-sales-conversation.dto'
import { ManualProspectStage } from './dto/update-prospect-stage.dto'
import { AiService } from '../sessions/ai.service'

const EMAIL_REGEX = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
const PHONE_REGEX = /(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}/

/** Não são usados para prospecção — evita capturar e-mails genéricos de plataformas. */
const IGNORED_EMAIL_DOMAINS = ['sentry.io', 'example.com', 'wixpress.com']

export interface ProspectFilters {
  city?: string
  state?: string
  status?: ProspectStatus
  minScore?: number
  source?: string
  hasEmail?: boolean
  hasPhone?: boolean
  hasLinkedin?: boolean
  hasPsymeet?: boolean
}

export type SalesConversationAnalysis = {
  stage: 'new' | 'engaged' | 'qualified' | 'trial' | 'won' | 'lost'
  interestLevel: 'low' | 'medium' | 'high'
  painPoints: string[]
  objections: string[]
  positiveSignals: string[]
  nextAction: string
  suggestedReply: string
  shouldStopContact: boolean
  reasoning: string
}

@Injectable()
export class ProspectingService {
  private readonly logger = new Logger(ProspectingService.name)

  constructor(
    @InjectRepository(Prospect) private readonly prospects: Repository<Prospect>,
    @InjectRepository(ProspectSignal) private readonly signals: Repository<ProspectSignal>,
    @InjectRepository(ProspectActivity) private readonly activities: Repository<ProspectActivity>,
    @InjectRepository(ProspectingSearch) private readonly searches: Repository<ProspectingSearch>,
    @Inject(SEARCH_PROVIDER) private readonly searchProvider: SearchProvider,
    private readonly queryBuilder: QueryBuilderService,
    private readonly dedupe: DedupeService,
    private readonly crawler: SiteCrawlerService,
    private readonly scoring: ScoringService,
    private readonly draft: DraftService,
    private readonly aiService: AiService,
  ) {}

  // ─── Buscas ────────────────────────────────────────────────────────────

  async previewSearch(dto: PreviewSearchDto): Promise<{ queries: string[]; sample: SearchResult[] }> {
    const queries = this.queryBuilder.build(dto)
    const sample = queries.length ? await this.searchProvider.search(queries[0], { maxResults: 3 }) : []
    return { queries, sample }
  }

  async createSearch(dto: CreateSearchDto, actorUserId?: string): Promise<ProspectingSearch> {
    const queries = this.queryBuilder.build(dto)
    const maxResults = Math.min(
      dto.maxResults ?? Number(process.env.PROSPECTING_MAX_RESULTS_PER_RUN ?? 100),
      Number(process.env.PROSPECTING_MAX_RESULTS_PER_RUN ?? 100),
    )

    const search = await this.searches.save(this.searches.create({
      city: dto.city,
      state: dto.state ?? null,
      query: queries.join(' | '),
      provider: this.searchProvider.name,
      status: 'running',
      startedAt: new Date(),
    }))

    try {
      let totalResults = 0
      const existing = await this.prospects.find({ where: { city: dto.city } })

      for (const query of queries) {
        const perQueryLimit = Math.max(1, Math.floor(maxResults / queries.length))
        const results = await this.searchProvider.search(query, { maxResults: perQueryLimit })
        totalResults += results.length

        for (const result of results) {
          await this.ingestResult(result, dto, existing, actorUserId)
        }
      }

      search.resultCount = totalResults
      search.status = 'completed'
      search.finishedAt = new Date()
      return this.searches.save(search)
    } catch (err) {
      search.status = 'error'
      search.errorMessage = err instanceof Error ? err.message : String(err)
      search.finishedAt = new Date()
      await this.searches.save(search)
      throw err
    }
  }

  private async ingestResult(
    result: SearchResult,
    filters: PreviewSearchDto,
    existing: Prospect[],
    actorUserId?: string,
  ): Promise<void> {
    const sourceType = this.sourceTypeFor(result.source)
    const websiteFromResult = sourceType === 'own_site' ? result.url : null

    const candidate = {
      website: websiteFromResult,
      sourceUrl: result.url,
      professionalName: this.guessNameFromTitle(result.title),
      city: filters.city,
      linkedinUrl: sourceType === 'linkedin_search' ? result.url : null,
      psymeetUrl: sourceType === 'psymeet_search' ? result.url : null,
    }

    if (await this.isBlockedByResidualHash(candidate)) {
      this.logger.debug('ingest_skipped_do_not_contact_hash')
      return
    }

    const match = this.dedupe.findMatch(candidate, existing)
    if (match) {
      await this.activities.save(this.activities.create({
        prospectId: match.id,
        action: 'merged_duplicate',
        actorUserId: actorUserId ?? null,
        notes: `Nova ocorrência da mesma fonte encontrada: ${result.source}`,
        metadata: { sourceUrl: result.url },
      }))
      return
    }

    const retentionDays = Number(process.env.PROSPECTING_RETENTION_DAYS ?? 180)
    const prospect = await this.prospects.save(this.prospects.create({
      professionalName: candidate.professionalName,
      city: filters.city,
      state: filters.state ?? null,
      website: candidate.website,
      websiteDomain: normalizeDomain(candidate.website),
      linkedinUrl: candidate.linkedinUrl,
      psymeetUrl: candidate.psymeetUrl,
      sourceUrl: result.url,
      sourceType,
      sourceTitle: result.title,
      sourceSnippet: result.snippet,
      status: 'discovered',
      discoveredAt: result.discoveredAt,
      retentionUntil: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000),
    }))
    existing.push(prospect)

    await this.activities.save(this.activities.create({
      prospectId: prospect.id,
      action: 'discovered',
      actorUserId: actorUserId ?? null,
      notes: `Descoberto via ${result.source}`,
      metadata: { sourceUrl: this.maskUrl(result.url) },
    }))
  }

  private sourceTypeFor(source: string): Prospect['sourceType'] {
    if (source === 'linkedin_search') return 'linkedin_search'
    if (source === 'psymeet_search') return 'psymeet_search'
    if (source === 'own_site') return 'own_site'
    return 'directory_search'
  }

  private guessNameFromTitle(title: string): string | null {
    const cleaned = title.split(/[-|–]/)[0]?.trim()
    return cleaned || null
  }

  // ─── Análise ───────────────────────────────────────────────────────────

  async analyzeProspect(id: string, actorUserId?: string): Promise<Prospect> {
    const prospect = await this.getOrThrow(id)
    prospect.status = 'analyzing'
    await this.prospects.save(prospect)

    try {
      let pageText = ''
      if (prospect.sourceType === 'own_site' && prospect.website) {
        const pages = await this.crawler.crawlSite(prospect.website)
        pageText = pages.map(p => this.stripHtml(p.html)).join('\n')
      }

      const email = this.extractEmail(pageText) ?? prospect.professionalEmail
      const phone = this.extractPhone(pageText) ?? prospect.professionalPhone

      const detected = detectSignals({
        text: pageText,
        email,
        phone,
        linkedinUrl: prospect.linkedinUrl,
        psymeetUrl: prospect.psymeetUrl,
        sourceType: prospect.sourceType,
        sourceUrl: prospect.sourceUrl,
        searchSnippet: `${prospect.sourceTitle ?? ''} ${prospect.sourceSnippet ?? ''}`,
      })

      const { score, confidence } = this.scoring.score(detected)

      await this.signals.save(detected.map(signal => this.signals.create({ ...signal, prospectId: prospect.id })))

      const minScore = Number(process.env.PROSPECTING_MIN_SCORE ?? 60)
      prospect.professionalEmail = email ?? null
      prospect.professionalPhone = phone ?? null
      prospect.score = score
      prospect.confidence = confidence
      prospect.analyzedAt = new Date()
      prospect.status = score >= minScore ? 'qualified' : 'analyzed'
      await this.prospects.save(prospect)

      await this.activities.save(this.activities.create({
        prospectId: prospect.id,
        action: 'analyzed',
        actorUserId: actorUserId ?? null,
        notes: `Score calculado: ${score} (${detected.length} sinais)`,
      }))

      return prospect
    } catch (err) {
      prospect.status = 'error'
      await this.prospects.save(prospect)
      await this.activities.save(this.activities.create({
        prospectId: prospect.id,
        action: 'analysis_failed',
        actorUserId: actorUserId ?? null,
        notes: err instanceof Error ? err.message : String(err),
      }))
      throw err
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim()
  }

  private extractEmail(text: string): string | null {
    const match = text.match(EMAIL_REGEX)
    if (!match) return null
    const email = match[0].toLowerCase()
    const domain = email.split('@')[1]
    return IGNORED_EMAIL_DOMAINS.includes(domain) ? null : email
  }

  private extractPhone(text: string): string | null {
    const match = text.match(PHONE_REGEX)
    return match ? match[0] : null
  }

  // ─── Governança / ações do administrador ──────────────────────────────

  async approve(id: string, actorUserId?: string, notes?: string): Promise<Prospect> {
    const prospect = await this.getOrThrow(id)
    if (prospect.doNotContact) {
      throw new BadRequestException('Lead marcado como "não contatar" não pode ser aprovado.')
    }
    prospect.status = 'approved'
    await this.prospects.save(prospect)
    await this.logActivity(id, 'approved', actorUserId, notes)
    return prospect
  }

  async discard(id: string, actorUserId?: string, notes?: string): Promise<Prospect> {
    const prospect = await this.getOrThrow(id)
    prospect.status = 'discarded'
    await this.prospects.save(prospect)
    await this.logActivity(id, 'discarded', actorUserId, notes)
    return prospect
  }

  async markDoNotContact(id: string, actorUserId?: string, notes?: string): Promise<Prospect> {
    const prospect = await this.getOrThrow(id)
    prospect.doNotContact = true
    prospect.doNotContactAt = new Date()
    prospect.status = 'do_not_contact'
    await this.prospects.save(prospect)
    await this.logActivity(id, 'do_not_contact', actorUserId, notes)
    return prospect
  }

  async deleteProspect(id: string, actorUserId?: string): Promise<{ deleted: true }> {
    const prospect = await this.getOrThrow(id)
    prospect.residualHash = this.buildResidualHash(prospect.websiteDomain, prospect.professionalEmail, prospect.professionalPhone)
    prospect.professionalName = null
    prospect.professionalEmail = null
    prospect.professionalPhone = null
    prospect.sourceSnippet = null
    prospect.sourceTitle = null
    prospect.website = null
    prospect.deletedAt = new Date()
    await this.prospects.save(prospect)
    await this.logActivity(id, 'deleted', actorUserId, 'Dados pessoais removidos a pedido do administrador (LGPD).')
    return { deleted: true }
  }

  async exportProspect(id: string): Promise<{ prospect: Prospect; signals: ProspectSignal[]; activities: ProspectActivity[] }> {
    const prospect = await this.getOrThrow(id)
    const [signals, activities] = await Promise.all([
      this.signals.find({ where: { prospectId: id }, order: { detectedAt: 'DESC' } }),
      this.activities.find({ where: { prospectId: id }, order: { createdAt: 'DESC' } }),
    ])
    await this.logActivity(id, 'exported', undefined, undefined)
    return { prospect, signals, activities }
  }

  async generateDraft(id: string, actorUserId?: string): Promise<{ draft: string; source: 'ai' | 'template' }> {
    const prospect = await this.getOrThrow(id)
    const signals = await this.signals.find({ where: { prospectId: id } })
    // Gera o template primeiro: cumpre as guardas (doNotContact/status) e já
    // deixa um fallback pronto caso a IA falhe — uma instabilidade do Groq
    // nunca bloqueia o admin de gerar um rascunho.
    const templateDraft = this.draft.generate(prospect, signals)

    let draftText = templateDraft
    let source: 'ai' | 'template' = 'template'
    try {
      const firstName = prospect.professionalName?.split(' ')[0] || 'Olá'
      const ai = await this.aiService.generateProspectOutreachDraft({
        firstName,
        sourceDescription: describeSource(prospect),
        signalMention: pickMention(signals),
      })
      draftText = ai.text.trim()
      source = 'ai'
    } catch (err: any) {
      this.logger.warn(`generateDraft: IA indisponível, usando template (${err?.message ?? 'erro desconhecido'})`)
    }

    await this.logActivity(id, 'draft_generated', actorUserId, source === 'ai' ? 'gerado por IA' : 'gerado por template (fallback)')
    return { draft: draftText, source }
  }

  /**
   * Sugestão de próxima mensagem a partir da resposta do lead, colada
   * manualmente pelo admin (sem captura automática de WhatsApp — ver
   * docs/PROSPECTING_RADAR.md). Mesmas guardas de generateDraft/DraftService.
   * Sem fallback por template: se a IA falhar, o admin escreve manualmente.
   */
  async suggestReply(id: string, dto: SuggestReplyDto, actorUserId?: string): Promise<{ suggestion: string }> {
    const prospect = await this.getOrThrow(id)
    if (prospect.doNotContact) {
      throw new BadRequestException('Este lead está marcado como "não contatar" — não é possível sugerir resposta.')
    }
    if (prospect.status !== 'approved') {
      throw new BadRequestException('Sugestão de resposta só é permitida após aprovação humana (status "approved").')
    }

    const firstName = prospect.professionalName?.split(' ')[0] || 'Olá'
    const ai = await this.aiService.generateProspectReplySuggestion({
      firstName,
      channel: dto.channel,
      priorMessage: dto.priorMessage ?? null,
      leadReplyText: dto.leadReplyText,
    })

    // Loga só o canal — nunca o texto colado pelo lead, pra manter o log de
    // atividade livre de conteúdo arbitrário/PII (mesmo padrão dos demais logs deste módulo).
    await this.logActivity(id, 'reply_suggested', actorUserId, `canal: ${dto.channel}`)
    return { suggestion: ai.text.trim() }
  }

  async analyzeSalesConversation(dto: AnalyzeSalesConversationDto): Promise<SalesConversationAnalysis> {
    const ai = await this.aiService.analyzeSalesConversation(dto)
    const parsed = this.parseSalesConversationAnalysis(ai.text)

    // Guarda determinística: mesmo que o modelo ignore uma recusa explícita,
    // o sistema nunca recomenda insistência comercial.
    const explicitOptOut = /\b(n[aã]o\s+(?:tenho|tenho mais|quero|me interessa)|sem interesse|pare de|n[aã]o (?:me )?contate|n[aã]o mande mais|remova meu contato)\b/i.test(dto.conversation)
    if (explicitOptOut) {
      parsed.stage = 'lost'
      parsed.interestLevel = 'low'
      parsed.shouldStopContact = true
      parsed.nextAction = 'Encerrar o contato e respeitar a decisão da pessoa.'
      parsed.suggestedReply = 'Obrigado por responder. Entendido — não entrarei mais em contato.'
    }

    return parsed
  }

  async updateStage(id: string, status: ManualProspectStage, actorUserId?: string): Promise<Prospect> {
    const prospect = await this.getOrThrow(id)
    if (prospect.doNotContact && status !== 'discarded') {
      throw new BadRequestException('Este lead está marcado como “não contatar” e não pode voltar ao funil ativo.')
    }
    const previousStatus = prospect.status
    if (previousStatus === status) return prospect

    prospect.status = status
    if (status === 'contacted' && !prospect.lastContactAt) prospect.lastContactAt = new Date()
    const saved = await this.prospects.save(prospect)
    await this.logActivity(id, 'status_changed', actorUserId, `${previousStatus} → ${status}`)
    return saved
  }

  private parseSalesConversationAnalysis(raw: string): SalesConversationAnalysis {
    let value: any
    try {
      const normalized = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      value = JSON.parse(normalized)
    } catch {
      throw new BadRequestException('A IA retornou uma análise inválida. Tente novamente.')
    }

    const stages = ['new', 'engaged', 'qualified', 'trial', 'won', 'lost']
    const levels = ['low', 'medium', 'high']
    const stringArray = (field: unknown) => Array.isArray(field) && field.length <= 10 && field.every(item => typeof item === 'string' && item.length <= 300)
    if (!value || !stages.includes(value.stage) || !levels.includes(value.interestLevel)
      || !stringArray(value.painPoints) || !stringArray(value.objections) || !stringArray(value.positiveSignals)
      || typeof value.nextAction !== 'string' || value.nextAction.length > 600
      || typeof value.suggestedReply !== 'string' || value.suggestedReply.length > 1000
      || typeof value.shouldStopContact !== 'boolean'
      || typeof value.reasoning !== 'string' || value.reasoning.length > 1000) {
      throw new BadRequestException('A IA retornou uma análise incompleta. Tente novamente.')
    }
    return value as SalesConversationAnalysis
  }

  // ─── Consulta ──────────────────────────────────────────────────────────

  async listProspects(filters: ProspectFilters): Promise<Prospect[]> {
    const qb = this.prospects.createQueryBuilder('p').where('p."deletedAt" IS NULL')

    if (filters.city) qb.andWhere('p.city ILIKE :city', { city: `%${filters.city}%` })
    if (filters.state) qb.andWhere('p.state = :state', { state: filters.state })
    if (filters.status) qb.andWhere('p.status = :status', { status: filters.status })
    if (filters.minScore !== undefined) qb.andWhere('p.score >= :minScore', { minScore: filters.minScore })
    if (filters.source) qb.andWhere('p."sourceType" = :source', { source: filters.source })
    if (filters.hasEmail) qb.andWhere('p."professionalEmail" IS NOT NULL')
    if (filters.hasPhone) qb.andWhere('p."professionalPhone" IS NOT NULL')
    if (filters.hasLinkedin) qb.andWhere('p."linkedinUrl" IS NOT NULL')
    if (filters.hasPsymeet) qb.andWhere('p."psymeetUrl" IS NOT NULL')

    return qb.orderBy('p.score', 'DESC').limit(200).getMany()
  }

  async getProspect(id: string): Promise<{ prospect: Prospect; signals: ProspectSignal[]; activities: ProspectActivity[] }> {
    const prospect = await this.getOrThrow(id)
    const [signals, activities] = await Promise.all([
      this.signals.find({ where: { prospectId: id }, order: { detectedAt: 'DESC' } }),
      this.activities.find({ where: { prospectId: id }, order: { createdAt: 'DESC' } }),
    ])
    return { prospect, signals, activities }
  }

  async listSearches(): Promise<ProspectingSearch[]> {
    return this.searches.find({ order: { createdAt: 'DESC' }, take: 100 })
  }

  /** Recuperação para buscas que ficaram presas (ex: processo reiniciado no meio da execução). */
  async recoverStaleSearches(staleAfterMs = 30 * 60 * 1000): Promise<{ recovered: number }> {
    const stale = await this.searches.find({ where: { status: 'running' } })
    const cutoff = Date.now() - staleAfterMs
    const toRecover = stale.filter(s => (s.startedAt?.getTime() ?? 0) < cutoff)
    for (const search of toRecover) {
      search.status = 'error'
      search.errorMessage = 'Busca não finalizou dentro do tempo esperado — marcada para nova tentativa manual.'
      search.finishedAt = new Date()
      await this.searches.save(search)
    }
    return { recovered: toRecover.length }
  }

  async analyzeBatch(statuses: ProspectStatus[], limit = 20): Promise<{ processed: number; errors: number }> {
    const pending = await this.prospects.find({ where: statuses.map(status => ({ status })), take: limit })
    let processed = 0
    let errors = 0
    for (const prospect of pending) {
      try {
        await this.analyzeProspect(prospect.id)
        processed += 1
      } catch {
        errors += 1
      }
    }
    return { processed, errors }
  }

  async metrics(): Promise<Record<string, any>> {
    const rows = await this.prospects
      .createQueryBuilder('p')
      .select('p.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('p."deletedAt" IS NULL')
      .groupBy('p.status')
      .getRawMany<{ status: ProspectStatus; count: string }>()

    const searchesRun = await this.searches.count()

    const base: Record<string, number> = { searchesRun }
    for (const row of rows) base[row.status] = Number(row.count)

    // Expand with conversation metrics
    const convBase = await this.buildConversationMetrics()

    return { ...base, ...convBase }
  }

  private async buildConversationMetrics(): Promise<Record<string, any>> {
    const conversationRepo = this.prospects.manager.getRepository(ProspectConversation)
    const messageRepo = this.prospects.manager.getRepository(ProspectMessage)

    const convStatuses = await conversationRepo
      .createQueryBuilder('c')
      .select('c.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.status')
      .getRawMany<{ status: string; count: string }>()

    const messagesAwaiting = await messageRepo
      .count({ where: { status: 'awaiting_approval' } })

    const totalMessages = await messageRepo.count()
    const optOuts = await conversationRepo.count({ where: { status: 'opted_out' } })
    const converted = await conversationRepo.count({ where: { status: 'converted' } })

    const metrics: Record<string, any> = {
      messagesAwaitingApproval: messagesAwaiting,
      totalMessages,
      optOuts,
      convertedConversations: converted,
    }

    for (const row of convStatuses) {
      metrics[`conversations_${row.status}`] = Number(row.count)
    }

    return metrics
  }

  // ─── LGPD: expiração e helpers ─────────────────────────────────────────

  async expireOldProspects(): Promise<{ expired: number }> {
    const unusedStatuses: ProspectStatus[] = ['discovered', 'analyzing', 'analyzed', 'qualified', 'error']
    const expired = await this.prospects.find({
      where: {
        retentionUntil: Not(IsNull()),
        deletedAt: IsNull(),
      },
    })

    const toExpire = expired.filter(p => p.retentionUntil < new Date() && unusedStatuses.includes(p.status))
    for (const prospect of toExpire) {
      prospect.residualHash = this.buildResidualHash(prospect.websiteDomain, prospect.professionalEmail, prospect.professionalPhone)
      prospect.professionalName = null
      prospect.professionalEmail = null
      prospect.professionalPhone = null
      prospect.sourceSnippet = null
      prospect.sourceTitle = null
      prospect.website = null
      prospect.status = 'expired'
      prospect.deletedAt = new Date()
      await this.prospects.save(prospect)
      await this.logActivity(prospect.id, 'expired', undefined, 'Retenção de 180 dias expirada sem uso.')
    }

    return { expired: toExpire.length }
  }

  /**
   * Hash mínimo (só o domínio normalizado) mantido após exclusão/expiração —
   * suficiente para impedir que uma futura busca redescubra o mesmo domínio
   * sem guardar nenhum dado pessoal (nome, e-mail, telefone).
   */
  private buildResidualHash(domain: string | null, email: string | null, phone: string | null): string | null {
    const identifier = normalizeDomain(domain) ?? normalizeEmail(email) ?? normalizePhone(phone)
    if (!identifier) return null
    return createHash('sha256').update(identifier).digest('hex')
  }

  private async isBlockedByResidualHash(candidate: { website?: string | null }): Promise<boolean> {
    const domain = normalizeDomain(candidate.website)
    if (!domain) return false
    const hash = createHash('sha256').update(domain).digest('hex')
    const blocked = await this.prospects.findOne({
      where: { residualHash: hash },
    })
    return !!blocked
  }

  private maskUrl(url: string): string {
    try {
      const parsed = new URL(url)
      return `${parsed.hostname}${parsed.pathname}`.slice(0, 80)
    } catch {
      return '[url]'
    }
  }

  private async logActivity(prospectId: string, action: ProspectActivityAction, actorUserId?: string, notes?: string): Promise<void> {
    await this.activities.save(this.activities.create({ prospectId, action, actorUserId: actorUserId ?? null, notes: notes ?? null }))
  }

  private async getOrThrow(id: string): Promise<Prospect> {
    const prospect = await this.prospects.findOne({ where: { id } })
    if (!prospect) throw new NotFoundException('Prospect não encontrado')
    return prospect
  }
}
