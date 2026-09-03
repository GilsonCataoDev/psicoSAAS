import { useState } from 'react'
import {
  Radar, Search, Globe, Linkedin, Users2, X, ShieldOff, Trash2,
  CheckCircle2, XCircle, FileText, Loader2, ExternalLink, MessageSquareText, Sparkles, Copy,
  LayoutGrid, List, ArrowRight, Clock3,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  useProspectingMetrics, useProspectingSearches, usePreviewSearch, useCreateSearch,
  useProspects, useProspect, useAnalyzeProspect, useApproveProspect, useDiscardProspect,
  useDoNotContactProspect, useDeleteProspect, useGenerateDraft, useSuggestReply,
  useAnalyzeSalesConversation, Prospect, ProspectStatus, ProspectSourceType, SearchFilters, ReplyChannel,
  SalesConversationAnalysis,
  ManualProspectStage, useUpdateProspectStage, useProspectingPipeline,
} from '@/hooks/api/prospecting'
import { ProspectDetailWithConversations } from '@/components/ProspectDetailWithConversations'

const STATUS_LABEL: Record<ProspectStatus, string> = {
  discovered: 'Descoberto', analyzing: 'Analisando', analyzed: 'Analisado',
  qualified: 'Qualificado', approved: 'Aprovado', contacted: 'Contatado',
  replied: 'Respondeu', interested: 'Interessado', registered: 'Cadastrado',
  activated: 'Ativado', discarded: 'Descartado', do_not_contact: 'Não contatar',
  expired: 'Expirado', error: 'Erro',
}

const STATUS_COLOR: Record<ProspectStatus, string> = {
  discovered: 'bg-neutral-100 text-neutral-600', analyzing: 'bg-blue-100 text-blue-700',
  analyzed: 'bg-blue-100 text-blue-700', qualified: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700', contacted: 'bg-sage-100 text-sage-700',
  replied: 'bg-sage-100 text-sage-700', interested: 'bg-sage-100 text-sage-700',
  registered: 'bg-emerald-100 text-emerald-700', activated: 'bg-emerald-100 text-emerald-700',
  discarded: 'bg-neutral-100 text-neutral-400', do_not_contact: 'bg-rose-100 text-rose-700',
  expired: 'bg-neutral-100 text-neutral-400', error: 'bg-rose-100 text-rose-700',
}

const SOURCE_LABEL: Record<ProspectSourceType, string> = {
  own_site: 'Site próprio', linkedin_search: 'LinkedIn', psymeet_search: 'PsyMeet', directory_search: 'Diretório',
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 60 ? 'bg-emerald-100 text-emerald-700' : score >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-500'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${color}`}>{score}</span>
}

function SalesPipelineCard({ onSelect }: { onSelect: (id: string) => void }) {
  const { data: pipeline, isLoading } = useProspectingPipeline()
  const stages = pipeline?.stages ?? []
  const hotCount = stages
    .filter(stage => ['replied', 'interested', 'registered'].includes(stage.status))
    .reduce((sum, stage) => sum + stage.count, 0)

  return (
    <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-800">Funil operacional</h2>
          <p className="mt-1 text-xs text-neutral-500">Priorize resposta, follow-up e conversão para teste/pago.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
            {pipeline?.awaitingApproval ?? 0} aguardando aprovação
          </span>
          <span className="rounded-full bg-sage-50 px-2.5 py-1 font-semibold text-sage-700">
            {hotCount} leads quentes
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 rounded-xl border border-dashed border-neutral-200 py-8 text-center text-xs text-neutral-400">
          Carregando funil...
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-2 lg:grid-cols-8">
            {stages.map((stage, index) => (
              <div key={stage.status} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[11px] font-semibold text-neutral-500">{STATUS_LABEL[stage.status]}</p>
                  {index > 0 && <ArrowRight className="h-3.5 w-3.5 text-neutral-300" />}
                </div>
                <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-800">{stage.count}</p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  {index === 0 ? 'entrada' : `${stage.fromPrevious}% da etapa anterior`}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-xl border border-neutral-100 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                  <Clock3 className="h-3.5 w-3.5 text-amber-600" /> Follow-ups vencidos
                </p>
                <span className="text-[11px] text-neutral-400">{pipeline?.dueFollowUps.length ?? 0} pendente(s)</span>
              </div>
              <div className="mt-2 space-y-2">
                {pipeline?.dueFollowUps.slice(0, 5).map(item => (
                  <button
                    key={item.conversationId}
                    type="button"
                    onClick={() => onSelect(item.prospectId)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 text-left hover:bg-amber-100"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-neutral-800">{item.professionalName ?? 'Lead sem nome'}</p>
                      <p className="text-[11px] text-neutral-500">
                        {item.channel} · {new Date(item.nextFollowUpAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-amber-700">
                      #{item.followUpCount + 1}
                    </span>
                  </button>
                ))}
                {pipeline?.dueFollowUps.length === 0 && (
                  <p className="rounded-lg border border-dashed border-neutral-200 py-6 text-center text-xs text-neutral-400">
                    Nenhum follow-up vencido.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-neutral-100 p-3">
              <p className="text-xs font-semibold text-neutral-700">Leitura rápida</p>
              <div className="mt-3 space-y-2 text-xs text-neutral-500">
                <p>Atacar primeiro: leads em <strong>Responderam</strong> e <strong>Interessados</strong>.</p>
                <p>Depois: aprovar mensagens pendentes e puxar quem está parado em <strong>Contatados</strong>.</p>
                <p>Lista de não contato: <strong>{pipeline?.noContact ?? 0}</strong>. Não insistir.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

const STAGE_LABEL: Record<SalesConversationAnalysis['stage'], string> = {
  new: 'Novo', engaged: 'Conversando', qualified: 'Qualificado', trial: 'Em teste',
  won: 'Cliente', lost: 'Encerrado',
}

const INTEREST_LABEL: Record<SalesConversationAnalysis['interestLevel'], string> = {
  low: 'Baixo', medium: 'Médio', high: 'Alto',
}

function SalesAssistantCard() {
  const analysis = useAnalyzeSalesConversation()
  const [channel, setChannel] = useState<ReplyChannel>('direct')
  const [conversation, setConversation] = useState('')
  const result = analysis.data

  async function copyReply() {
    if (!result?.suggestedReply) return
    await navigator.clipboard.writeText(result.suggestedReply)
    toast.success('Resposta copiada. Revise antes de enviar.')
  }

  return (
    <section className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <h2 className="text-sm font-semibold text-neutral-800">Assistente comercial</h2>
          </div>
          <p className="mt-1 text-xs text-neutral-500">Cole uma conversa para identificar interesse, dores, objeções e a próxima resposta.</p>
        </div>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">Nunca envia automaticamente</span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[160px_1fr]">
        <select value={channel} onChange={event => setChannel(event.target.value as ReplyChannel)}
          className="h-10 rounded-xl border border-neutral-200 px-3 text-sm text-neutral-600 outline-none focus:border-purple-400">
          <option value="direct">Instagram Direct</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <textarea value={conversation} onChange={event => setConversation(event.target.value)} rows={5} maxLength={12_000}
          placeholder={'Cole a conversa aqui. Se possível, use “Eu:” e “Lead:”. Não inclua informações clínicas.'}
          className="w-full rounded-xl border border-neutral-200 p-3 text-sm outline-none focus:border-purple-400" />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-neutral-400">O texto não é salvo no banco. Telefones, e-mails e CPF são removidos antes da IA.</p>
        <button type="button" disabled={analysis.isPending || conversation.trim().length < 10}
          onClick={() => analysis.mutate({ channel, conversation: conversation.trim() }, {
            onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Não foi possível analisar a conversa.'),
          })}
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-purple-600 px-4 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-40">
          {analysis.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {analysis.isPending ? 'Analisando…' : 'Analisar conversa'}
        </button>
      </div>

      {result && (
        <div className="mt-5 space-y-4 border-t border-neutral-100 pt-5">
          {result.shouldStopContact && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
              A pessoa indicou que não deseja continuar. Encerre o contato e não faça novo follow-up.
            </div>
          )}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-neutral-100 px-3 py-1 font-semibold text-neutral-700">Etapa: {STAGE_LABEL[result.stage]}</span>
            <span className="rounded-full bg-purple-50 px-3 py-1 font-semibold text-purple-700">Interesse: {INTEREST_LABEL[result.interestLevel]}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {([
              ['Dores identificadas', result.painPoints],
              ['Objeções', result.objections],
              ['Sinais positivos', result.positiveSignals],
            ] as const).map(([title, items]) => (
              <div key={title} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
                <p className="text-xs font-semibold text-neutral-700">{title}</p>
                {items.length > 0
                  ? <ul className="mt-2 space-y-1 text-xs text-neutral-600">{items.map(item => <li key={item}>• {item}</li>)}</ul>
                  : <p className="mt-2 text-xs text-neutral-400">Nada declarado.</p>}
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-sage-100 bg-sage-50 p-3">
            <p className="text-xs font-semibold text-sage-800">Próxima ação</p>
            <p className="mt-1 text-sm text-neutral-700">{result.nextAction}</p>
          </div>
          <div className="rounded-xl border border-purple-100 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-purple-700">Resposta sugerida — revise antes de enviar</p>
              <button type="button" onClick={copyReply} className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 hover:text-purple-900">
                <Copy className="h-3.5 w-3.5" /> Copiar
              </button>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{result.suggestedReply}</p>
          </div>
          <details className="text-xs text-neutral-500">
            <summary className="cursor-pointer font-medium">Por que a IA classificou assim?</summary>
            <p className="mt-2 leading-relaxed">{result.reasoning}</p>
          </details>
        </div>
      )}
    </section>
  )
}

const KANBAN_COLUMNS: Array<{ status: ManualProspectStage; title: string; matches: ProspectStatus[]; color: string }> = [
  { status: 'discovered', title: 'Novos', matches: ['discovered', 'analyzing', 'analyzed', 'qualified', 'approved'], color: 'border-neutral-200' },
  { status: 'contacted', title: 'Contatados', matches: ['contacted'], color: 'border-blue-200' },
  { status: 'replied', title: 'Responderam', matches: ['replied'], color: 'border-violet-200' },
  { status: 'interested', title: 'Interessados', matches: ['interested'], color: 'border-amber-200' },
  { status: 'registered', title: 'Cadastrados', matches: ['registered'], color: 'border-sky-200' },
  { status: 'activated', title: 'Ativados', matches: ['activated'], color: 'border-emerald-200' },
  { status: 'discarded', title: 'Encerrados', matches: ['discarded', 'do_not_contact', 'expired', 'error'], color: 'border-rose-200' },
]

function ProspectKanban({ prospects, onSelect }: { prospects: Prospect[]; onSelect: (id: string) => void }) {
  const updateStage = useUpdateProspectStage()
  const [draggedId, setDraggedId] = useState<string | null>(null)

  function move(id: string, status: ManualProspectStage) {
    updateStage.mutate({ id, status }, {
      onSuccess: () => toast.success('Etapa atualizada.'),
      onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Não foi possível mover o lead.'),
    })
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[1540px] grid-cols-7 gap-3">
        {KANBAN_COLUMNS.map(column => {
          const cards = prospects.filter(prospect => column.matches.includes(prospect.status))
          return (
            <section key={column.status}
              onDragOver={event => event.preventDefault()}
              onDrop={() => { if (draggedId) move(draggedId, column.status); setDraggedId(null) }}
              className={`min-h-[260px] rounded-2xl border-t-4 bg-neutral-50 p-3 ${column.color}`}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-neutral-700">{column.title}</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-500">{cards.length}</span>
              </div>
              <div className="space-y-2">
                {cards.map(prospect => (
                  <article key={prospect.id} draggable={!prospect.doNotContact}
                    onDragStart={() => setDraggedId(prospect.id)} onDragEnd={() => setDraggedId(null)}
                    className="rounded-xl border border-neutral-100 bg-white p-3 shadow-sm">
                    <button type="button" onClick={() => onSelect(prospect.id)} className="w-full text-left">
                      <p className="truncate text-sm font-semibold text-neutral-800">{prospect.professionalName ?? 'Nome não identificado'}</p>
                      <p className="mt-1 truncate text-[11px] text-neutral-400">{prospect.city ?? 'Cidade não informada'}{prospect.state ? `/${prospect.state}` : ''}</p>
                    </button>
                    <div className="mt-3 flex items-center gap-2">
                      <ScoreBadge score={prospect.score} />
                      <select value={column.status} disabled={updateStage.isPending || prospect.doNotContact}
                        aria-label={`Mover ${prospect.professionalName ?? 'lead'} para outra etapa`}
                        onChange={event => move(prospect.id, event.target.value as ManualProspectStage)}
                        className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-1.5 py-1 text-[10px] text-neutral-500 disabled:opacity-50">
                        {KANBAN_COLUMNS.map(option => <option key={option.status} value={option.status}>{option.title}</option>)}
                      </select>
                    </div>
                    {prospect.doNotContact && <p className="mt-2 text-[10px] font-medium text-rose-600">Não contatar</p>}
                  </article>
                ))}
                {cards.length === 0 && <p className="py-8 text-center text-[11px] text-neutral-400">Nenhum lead</p>}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function NewSearchForm() {
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [approach, setApproach] = useState('')
  const [modality, setModality] = useState<'online' | 'presencial' | 'ambos'>('ambos')
  const [sources, setSources] = useState<ProspectSourceType[]>(['own_site'])
  const preview = usePreviewSearch()
  const create = useCreateSearch()

  function toggleSource(source: ProspectSourceType) {
    setSources(prev => prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source])
  }

  function buildFilters(): SearchFilters {
    return { city: city.trim(), state: state.trim() || undefined, approach: approach.trim() || undefined, modality, sources }
  }

  function handlePreview() {
    if (!city.trim() || sources.length === 0) return
    preview.mutate(buildFilters())
  }

  function handleExecute() {
    if (!city.trim() || sources.length === 0) return
    create.mutate(buildFilters(), {
      onSuccess: () => toast.success('Busca executada. Novos leads aparecem na lista abaixo.'),
      onError: () => toast.error('Não foi possível executar a busca.'),
    })
  }

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Search className="h-4 w-4 text-sage-600" />
        <h2 className="text-sm font-semibold text-neutral-800">Nova busca</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <input
          value={city} onChange={e => setCity(e.target.value)} placeholder="Cidade *"
          className="h-10 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-sage-400"
        />
        <input
          value={state} onChange={e => setState(e.target.value.toUpperCase().slice(0, 2))} placeholder="UF"
          className="h-10 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-sage-400"
        />
        <input
          value={approach} onChange={e => setApproach(e.target.value)} placeholder="Abordagem (ex: TCC)"
          className="h-10 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-sage-400"
        />
        <select
          value={modality} onChange={e => setModality(e.target.value as any)}
          className="h-10 rounded-xl border border-neutral-200 px-3 text-sm text-neutral-600 outline-none focus:border-sage-400"
        >
          <option value="ambos">Online e presencial</option>
          <option value="online">Só online</option>
          <option value="presencial">Só presencial</option>
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {([
          { key: 'own_site', icon: Globe, label: 'Sites próprios' },
          { key: 'linkedin_search', icon: Linkedin, label: 'LinkedIn (indexado)' },
          { key: 'psymeet_search', icon: Users2, label: 'PsyMeet (indexado)' },
        ] as const).map(({ key, icon: Icon, label }) => (
          <button
            key={key} type="button" onClick={() => toggleSource(key)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
              sources.includes(key) ? 'border-sage-400 bg-sage-50 text-sage-700' : 'border-neutral-200 text-neutral-500'
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button" onClick={handlePreview} disabled={!city.trim() || preview.isPending}
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
        >
          {preview.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Simular
        </button>
        <button
          type="button" onClick={handleExecute} disabled={!city.trim() || create.isPending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sage-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sage-700 disabled:opacity-50"
        >
          {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Executar busca
        </button>
      </div>

      {preview.data && (
        <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            {preview.data.queries.length} query(s) geradas · amostra de resultados
          </p>
          <div className="space-y-1">
            {preview.data.queries.map(q => (
              <p key={q} className="truncate font-mono text-[11px] text-neutral-500">{q}</p>
            ))}
          </div>
          {preview.data.sample.length > 0 && (
            <div className="mt-2 space-y-1.5 border-t border-neutral-200 pt-2">
              {preview.data.sample.map(s => (
                <p key={s.url} className="truncate text-xs text-neutral-600">
                  <span className="font-medium">{s.title}</span> — {s.url}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ProspectDetailDrawer({ id, onClose, onOpenConversations }: { id: string; onClose: () => void; onOpenConversations: (name: string) => void }) {
  const { data, isLoading } = useProspect(id)
  const analyze = useAnalyzeProspect()
  const approve = useApproveProspect()
  const discard = useDiscardProspect()
  const doNotContact = useDoNotContactProspect()
  const remove = useDeleteProspect()
  const draft = useGenerateDraft()
  const [draftText, setDraftText] = useState<string | null>(null)
  const [draftSource, setDraftSource] = useState<'ai' | 'template' | null>(null)

  const suggestReply = useSuggestReply()
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyChannel, setReplyChannel] = useState<ReplyChannel>('whatsapp')
  const [leadReplyText, setLeadReplyText] = useState('')
  const [replySuggestion, setReplySuggestion] = useState<string | null>(null)

  function run(mutation: ReturnType<typeof useAnalyzeProspect>, successMsg: string) {
    mutation.mutate({ id }, { onSuccess: () => toast.success(successMsg), onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Ação falhou.') })
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-800">Detalhes do lead</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-neutral-100"><X className="h-4 w-4" /></button>
        </div>

        {isLoading && <p className="text-sm text-neutral-400">Carregando…</p>}

        {data && (
          <div className="space-y-5">
            <div>
              <p className="text-base font-semibold text-neutral-800">{data.prospect.professionalName ?? '(nome não identificado)'}</p>
              <p className="text-xs text-neutral-500">{data.prospect.city}{data.prospect.state ? `, ${data.prospect.state}` : ''}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ScoreBadge score={data.prospect.score} />
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[data.prospect.status]}`}>
                  {STATUS_LABEL[data.prospect.status]}
                </span>
                <span className="text-[11px] text-neutral-400">{SOURCE_LABEL[data.prospect.sourceType]}</span>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-xs">
              <p className="mb-1 font-semibold text-neutral-500">Fonte</p>
              <a href={data.prospect.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sage-700 hover:underline">
                {data.prospect.sourceUrl} <ExternalLink className="h-3 w-3" />
              </a>
              {data.prospect.sourceSnippet && <p className="mt-1 text-neutral-500">{data.prospect.sourceSnippet}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-neutral-100 p-2">
                <p className="text-neutral-400">E-mail</p>
                <p className="text-neutral-700">{data.prospect.professionalEmail ?? '—'}</p>
              </div>
              <div className="rounded-xl border border-neutral-100 p-2">
                <p className="text-neutral-400">Telefone</p>
                <p className="text-neutral-700">{data.prospect.professionalPhone ?? '—'}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-neutral-500">Sinais ({data.signals.length}) — score explicado</p>
              <div className="space-y-1.5">
                {data.signals.map(s => (
                  <div key={s.id} className="flex items-start justify-between gap-2 rounded-lg border border-neutral-100 px-2.5 py-1.5 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-700">{s.type}</p>
                      <p className="truncate text-neutral-400">{s.evidence}</p>
                    </div>
                    <span className={`shrink-0 font-semibold tabular-nums ${s.points >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {s.points > 0 ? '+' : ''}{s.points}
                    </span>
                  </div>
                ))}
                {data.signals.length === 0 && <p className="text-xs text-neutral-400">Ainda não analisado.</p>}
              </div>
            </div>

            {draftText && (
              <div className="rounded-xl border border-sage-200 bg-sage-50 p-3 text-xs text-neutral-700">
                <p className="mb-1 flex items-center gap-1.5 font-semibold text-sage-700">
                  Rascunho (não enviado)
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${draftSource === 'ai' ? 'bg-purple-100 text-purple-700' : 'bg-neutral-200 text-neutral-500'}`}>
                    {draftSource === 'ai' ? 'gerado por IA' : 'modelo padrão (IA indisponível)'}
                  </span>
                </p>
                {draftText}
              </div>
            )}

            {(data.prospect.status === 'approved' && !data.prospect.doNotContact) && (
              <div className="rounded-xl border border-neutral-100 p-3">
                <button
                  type="button" onClick={() => setShowReplyForm(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600"
                >
                  <MessageSquareText className="h-3.5 w-3.5" /> Colar resposta do lead → sugerir próxima mensagem
                </button>
                {showReplyForm && (
                  <div className="mt-3 space-y-2">
                    <select
                      value={replyChannel} onChange={e => setReplyChannel(e.target.value as ReplyChannel)}
                      className="h-9 w-full rounded-lg border border-neutral-200 px-2 text-xs text-neutral-600 outline-none focus:border-sage-400"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="direct">Contato direto</option>
                    </select>
                    <textarea
                      value={leadReplyText} onChange={e => setLeadReplyText(e.target.value)}
                      placeholder="Cole aqui o que o lead respondeu…" rows={3}
                      className="w-full rounded-lg border border-neutral-200 p-2 text-xs outline-none focus:border-sage-400"
                    />
                    <button
                      type="button"
                      onClick={() => suggestReply.mutate(
                        { id, channel: replyChannel, leadReplyText, priorMessage: draftText ?? undefined },
                        {
                          onSuccess: r => setReplySuggestion(r.suggestion),
                          onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Não foi possível gerar a sugestão.'),
                        },
                      )}
                      disabled={suggestReply.isPending || !leadReplyText.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sage-200 px-3 py-1.5 text-xs font-medium text-sage-700 hover:bg-sage-50 disabled:opacity-40"
                    >
                      {suggestReply.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Sugerir resposta com IA
                    </button>
                    {replySuggestion && (
                      <div className="rounded-lg border border-sage-200 bg-sage-50 p-2 text-xs text-neutral-700">{replySuggestion}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold text-neutral-500">Histórico</p>
              <div className="space-y-1">
                {data.activities.map(a => (
                  <p key={a.id} className="text-[11px] text-neutral-400">
                    {new Date(a.createdAt).toLocaleString('pt-BR')} — {a.action}{a.notes ? ` · ${a.notes}` : ''}
                  </p>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
              <button
                type="button"
                onClick={() => onOpenConversations(data.prospect.professionalName ?? 'Lead sem nome')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sage-200 px-3 py-1.5 text-xs font-medium text-sage-700 hover:bg-sage-50"
              >
                <MessageSquareText className="h-3.5 w-3.5" /> Conversas
              </button>
              <button onClick={() => run(analyze, 'Análise concluída.')} disabled={analyze.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40">
                <Search className="h-3.5 w-3.5" /> Analisar
              </button>
              <button onClick={() => run(approve, 'Lead aprovado.')} disabled={approve.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40">
                <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
              </button>
              <button onClick={() => run(discard, 'Lead descartado.')} disabled={discard.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40">
                <XCircle className="h-3.5 w-3.5" /> Descartar
              </button>
              <button onClick={() => run(doNotContact, 'Marcado como não contatar.')} disabled={doNotContact.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-40">
                <ShieldOff className="h-3.5 w-3.5" /> Não contatar
              </button>
              <button
                onClick={() => draft.mutate(id, {
                  onSuccess: r => { setDraftText(r.draft); setDraftSource(r.source) },
                  onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Rascunho requer aprovação prévia.'),
                })}
                disabled={draft.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sage-200 px-3 py-1.5 text-xs font-medium text-sage-700 hover:bg-sage-50 disabled:opacity-40">
                {draft.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} Gerar rascunho com IA
              </button>
              <button
                onClick={() => {
                  if (!confirm('Excluir dados pessoais deste lead? Essa ação não pode ser desfeita.')) return
                  remove.mutate(id, { onSuccess: () => { toast.success('Dados removidos.'); onClose() } })
                }}
                disabled={remove.isPending}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-500 hover:border-rose-300 hover:text-rose-700 disabled:opacity-40">
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProspectingPage() {
  const [filters, setFilters] = useState<{ city: string; state: string; status: ProspectStatus | ''; minScore: string }>({
    city: '', state: '', status: '', minScore: '',
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [conversationLead, setConversationLead] = useState<{ id: string; name: string } | null>(null)
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const { data: metrics } = useProspectingMetrics()
  const { data: searches } = useProspectingSearches()
  const { data: prospects, isLoading } = useProspects({
    city: filters.city || undefined,
    state: filters.state || undefined,
    status: (filters.status || undefined) as ProspectStatus | undefined,
    minScore: filters.minScore ? Number(filters.minScore) : undefined,
  })

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-50">
          <Radar className="h-4 w-4 text-sage-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-neutral-800">Radar de Psicólogos</h1>
          <p className="text-xs text-neutral-400">Prospecção com aprovação humana — nenhuma mensagem é enviada automaticamente.</p>
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {([
            ['searchesRun', 'Buscas'], ['discovered', 'Descobertos'], ['analyzed', 'Analisados'],
            ['qualified', 'Qualificados'], ['approved', 'Aprovados'], ['contacted', 'Contatados'],
            ['registered', 'Cadastrados'], ['activated', 'Ativados'],
          ] as const).map(([key, label]) => (
            <div key={key} className="rounded-xl border border-neutral-100 bg-white p-3 text-center shadow-sm">
              <p className="text-lg font-bold text-neutral-800 tabular-nums">{metrics[key] ?? 0}</p>
              <p className="text-[11px] text-neutral-400">{label}</p>
            </div>
          ))}
        </div>
      )}

      <SalesPipelineCard onSelect={setSelectedId} />

      <SalesAssistantCard />

      <NewSearchForm />

      <div className="rounded-2xl border border-neutral-100 bg-white p-3 shadow-sm">
        <div className="grid gap-2 md:grid-cols-5">
          <input value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))} placeholder="Filtrar por cidade"
            className="h-9 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-sage-400" />
          <input value={filters.state} onChange={e => setFilters(f => ({ ...f, state: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="UF"
            className="h-9 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-sage-400" />
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value as ProspectStatus | '' }))}
            className="h-9 rounded-xl border border-neutral-200 px-3 text-sm text-neutral-600 outline-none focus:border-sage-400">
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input value={filters.minScore} onChange={e => setFilters(f => ({ ...f, minScore: e.target.value.replace(/\D/g, '') }))} placeholder="Score mínimo"
            className="h-9 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-sage-400" />
          <button type="button" onClick={() => setFilters({ city: '', state: '', status: '', minScore: '' })}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 px-3 text-sm text-neutral-500 hover:bg-neutral-50">
            <X className="h-3.5 w-3.5" /> Limpar
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-1">
        <button type="button" onClick={() => setView('kanban')} aria-pressed={view === 'kanban'}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium ${view === 'kanban' ? 'bg-sage-100 text-sage-800' : 'text-neutral-500 hover:bg-neutral-100'}`}>
          <LayoutGrid className="h-3.5 w-3.5" /> Kanban
        </button>
        <button type="button" onClick={() => setView('list')} aria-pressed={view === 'list'}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium ${view === 'list' ? 'bg-sage-100 text-sage-800' : 'text-neutral-500 hover:bg-neutral-100'}`}>
          <List className="h-3.5 w-3.5" /> Lista
        </button>
      </div>

      {view === 'kanban' && <ProspectKanban prospects={prospects ?? []} onSelect={setSelectedId} />}

      {view === 'list' && <div className="overflow-x-auto rounded-2xl border border-neutral-100 bg-white shadow-sm">
        <table className="min-w-[880px] w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Cidade</th>
              <th className="px-4 py-3">Fonte</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Descoberto</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {isLoading && <tr><td colSpan={7} className="py-10 text-center text-xs text-neutral-400">Carregando…</td></tr>}
            {!isLoading && (prospects?.length ?? 0) === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-xs text-neutral-400">Nenhum lead encontrado. Execute uma busca acima.</td></tr>
            )}
            {prospects?.map((p: Prospect) => (
              <tr key={p.id} className="cursor-pointer hover:bg-neutral-50/60" onClick={() => setSelectedId(p.id)}>
                <td className="px-4 py-3 font-medium text-neutral-800">{p.professionalName ?? '—'}</td>
                <td className="px-4 py-3 text-neutral-500">{p.city}{p.state ? `/${p.state}` : ''}</td>
                <td className="px-4 py-3 text-xs text-neutral-500">{SOURCE_LABEL[p.sourceType]}</td>
                <td className="px-4 py-3"><ScoreBadge score={p.score} /></td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                </td>
                <td className="px-4 py-3 text-xs text-neutral-400">{new Date(p.discoveredAt).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3 text-right text-xs text-sage-600">Ver detalhes</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}

      {searches && searches.length > 0 && (
        <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold text-neutral-500">Buscas recentes</p>
          <div className="space-y-1">
            {searches.slice(0, 10).map(s => (
              <p key={s.id} className="text-xs text-neutral-500">
                {new Date(s.createdAt).toLocaleString('pt-BR')} — {s.city}{s.state ? `/${s.state}` : ''} · {s.resultCount} resultado(s) · {s.status}
              </p>
            ))}
          </div>
        </div>
      )}

      {selectedId && (
        <ProspectDetailDrawer
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onOpenConversations={(name) => setConversationLead({ id: selectedId, name })}
        />
      )}
      {conversationLead && (
        <ProspectDetailWithConversations
          prospectId={conversationLead.id}
          prospectName={conversationLead.name}
          onClose={() => setConversationLead(null)}
        />
      )}
    </div>
  )
}
