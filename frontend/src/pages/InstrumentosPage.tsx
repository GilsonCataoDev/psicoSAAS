import { useEffect, useState, useMemo } from 'react'
import { Search, Download, X, MessageSquare } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { useCreateInstrumentAssignment, usePatients } from '@/hooks/useApi'
import {
  CARD_ACCENTS,
  CAT_COLOR,
  CAT_LABEL,
  INSTRUMENTS,
} from '@/features/instruments/instrument-catalog'
import type {
  AgeGroup,
  Instrument,
  InstrumentCategory,
} from '@/features/instruments/instrument-catalog'

function renderLine(line: string, idx: number) {
  if (!line.trim()) return <div key={idx} className="h-2" />

  const isHeader =
    line === line.toUpperCase() &&
    line.trim().length > 2 &&
    /^[A-ZÁÀÃÂÉÊÍÓÔÕÚÜÇ\s/—]+$/.test(line.trim())

  if (isHeader) {
    return (
      <div key={idx} className="flex items-center gap-3 pt-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 whitespace-nowrap">
          {line.trim()}
        </p>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>
    )
  }

  const colonIdx = line.indexOf(':')
  if (colonIdx > 0) {
    const label = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    return (
      <div key={idx} className="grid grid-cols-[180px_1fr] gap-3 items-end py-1 border-b border-dashed border-neutral-150">
        <span className="text-[11px] font-semibold text-neutral-500 pb-0.5 leading-tight">{label}</span>
        <span className="text-sm text-neutral-700 pb-0.5 min-h-[1.5rem]">
          {value || <span className="text-neutral-200 select-none">_</span>}
        </span>
      </div>
    )
  }

  return (
    <p key={idx} className="text-xs text-neutral-400 italic py-0.5">
      {line}
    </p>
  )
}

// ── Modal de instrumento ─────────────────────────────────────────────────────

function InstrumentModal({
  instrument,
  onClose,
  onSend,
}: {
  instrument: Instrument | null
  onClose: () => void
  onSend: (instrument: Instrument) => void
}) {
  if (!instrument) return null

  const inst = instrument   // narrowed local — TypeScript carries this into closures
  const lines = inst.template.split('\n')
  const fieldCount = lines.filter(l => l.trim().endsWith(':')).length

  function escHtml(v: string) {
    return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  function printInstrument() {
    const rows = lines.map(line => {
      if (!line.trim()) return '<div style="height:8px"></div>'
      const isHeader =
        line === line.toUpperCase() &&
        line.trim().length > 2 &&
        /^[A-ZÁÀÃÂÉÊÍÓÔÕÚÜÇ\s/—]+$/.test(line.trim())
      if (isHeader) {
        return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0 4px">
          <span style="font-size:8.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b7280;white-space:nowrap">${escHtml(line.trim())}</span>
          <div style="flex:1;height:1px;background:#d1d5db"></div></div>`
      }
      const ci = line.indexOf(':')
      if (ci > 0) {
        const label = escHtml(line.slice(0, ci).trim())
        const value = escHtml(line.slice(ci + 1).trim())
        return `<div style="display:grid;grid-template-columns:170px 1fr;gap:8px;padding:5px 0;border-bottom:1px dashed #e5e7eb">
          <span style="font-size:9px;font-weight:600;color:#6b7280;padding-top:2px">${label}</span>
          <span style="font-size:11px;color:#374151;padding-bottom:3px">${value || ''}</span></div>`
      }
      return `<p style="font-size:9px;color:#9ca3af;font-style:italic;margin:2px 0">${escHtml(line)}</p>`
    }).join('')

    const catLabel = CAT_LABEL[inst.category]
    const html = `<!doctype html><html><head><title>${escHtml(inst.title)}</title>
<style>
@page{size:A4;margin:16mm 14mm}
*{box-sizing:border-box}
html,body{width:210mm;min-height:297mm;margin:0;background:#fff;font-family:Arial,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.header{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:14px}
.badge{display:inline-block;font-size:8px;font-weight:700;padding:2px 7px;border-radius:20px;border:1px solid #d1d5db;color:#374151;margin-top:4px}
</style>
</head><body><div>
<div class="header">
  <p style="font-size:14px;font-weight:700;margin:0 0 2px">${escHtml(inst.title)}</p>
  <p style="font-size:9.5px;color:#6b7280;margin:0 0 4px">${escHtml(inst.description)}</p>
  <span class="badge">${escHtml(catLabel)}</span>
  <span class="badge" style="margin-left:4px">${fieldCount} campos</span>
  <span class="badge" style="margin-left:4px">Profissional: ___________________________ | CRP: ____________ | Data: ____/____/____</span>
</div>
${rows}
<p style="font-size:8px;color:#9ca3af;margin-top:16px;border-top:1px solid #e5e7eb;padding-top:8px">Instrumento de apoio clínico · não substitui prontuário oficial · UseCognia</p>
</div></body></html>`

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.opener = null
      printWindow.document.open()
      printWindow.document.write(html)
      printWindow.document.close()
      setTimeout(() => { printWindow.focus(); printWindow.print() }, 250)
      return
    }

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) {
      iframe.remove()
      toast.error('Não foi possível abrir a impressão neste navegador.')
      return
    }

    doc.open()
    doc.write(html)
    doc.close()
    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => iframe.remove(), 1000)
    }, 250)
  }

  return (
    <Modal open={!!instrument} onClose={onClose} title={instrument.title} size="lg">
      <div className="space-y-4">
        {/* Header info */}
        <div className="flex items-start gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3">
          <instrument.Icon className="w-5 h-5 text-sage-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-neutral-600 leading-relaxed">{instrument.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CAT_COLOR[instrument.category]}`}>
                {CAT_LABEL[instrument.category]}
              </span>
              {instrument.tags.map(t => (
                <span key={t} className="text-[11px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <span className="text-xs text-neutral-400 shrink-0">{fieldCount} campos</span>
        </div>

        {/* Formulário */}
        <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
          <div className="bg-neutral-50 border-b border-neutral-100 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-sage-400" />
              <span className="text-xs font-medium text-neutral-500">Formulário para preenchimento</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span>Profissional: <span className="inline-block w-24 border-b border-neutral-300">&nbsp;</span></span>
              <span>Data: <span className="inline-block w-16 border-b border-neutral-300">&nbsp;</span></span>
            </div>
          </div>
          <div className="px-5 py-4 space-y-0.5 max-h-[50vh] overflow-y-auto">
            {lines.map((line, idx) => renderLine(line, idx))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-400">
            Instrumento de apoio clínico · não substitui prontuário oficial
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Fechar</button>
            <button type="button" onClick={() => onSend(inst)} className="btn-secondary text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Enviar formulário
            </button>
            <button type="button" onClick={printInstrument} className="btn-primary text-sm flex items-center gap-2">
              <Download className="w-4 h-4" />
              Imprimir / PDF
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Card de instrumento ──────────────────────────────────────────────────────

function InstrumentCard({
  instrument,
  index,
  onClick,
}: {
  instrument: Instrument
  index: number
  onClick: () => void
}) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length]
  const fieldCount = instrument.template.split('\n').filter(l => l.trim().endsWith(':')).length

  return (
    <button
      type="button"
      onClick={onClick}
      className="card group flex flex-col items-start gap-3 p-4 text-left hover:shadow-lifted hover:-translate-y-px transition-all duration-200 hover:border-sage-200 cursor-pointer"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${accent}`}>
        <instrument.Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0 w-full">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-neutral-800 leading-tight">{instrument.title}</p>
          <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CAT_COLOR[instrument.category]}`}>
            {CAT_LABEL[instrument.category]}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-neutral-400 line-clamp-2">{instrument.description}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {instrument.tags.slice(0, 3).map(t => (
            <span key={t} className="text-[10px] text-neutral-400 bg-neutral-50 border border-neutral-100 px-1.5 py-0.5 rounded-full">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="flex w-full items-center justify-between pt-1 border-t border-neutral-100">
        <span className="text-[11px] text-neutral-300">{fieldCount} campos</span>
        <span className="text-xs font-medium text-sage-600 group-hover:text-sage-700">
          Abrir →
        </span>
      </div>
    </button>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

const ALL_CATEGORIES: Array<{ value: InstrumentCategory | 'all'; label: string }> = [
  { value: 'all',        label: 'Todos' },
  { value: 'formulario', label: 'Formulários' },
  { value: 'escala',     label: 'Escalas' },
  { value: 'registro',   label: 'Registros' },
  { value: 'entrevista', label: 'Entrevistas' },
]

const ALL_AGES: Array<{ value: AgeGroup | 'all'; label: string }> = [
  { value: 'all',         label: 'Todas as idades' },
  { value: 'infantil',    label: 'Infantil' },
  { value: 'adolescente', label: 'Adolescente' },
  { value: 'adulto',      label: 'Adulto' },
]

function SendInstrumentModal({
  instrument,
  onClose,
}: {
  instrument: Instrument | null
  onClose: () => void
}) {
  const { data: patients = [] } = usePatients({ enabled: !!instrument })
  const createAssignment = useCreateInstrumentAssignment()
  const [patientId, setPatientId] = useState('')
  const [sendWhatsApp, setSendWhatsApp] = useState(true)
  const [extraAnamneseQuestions, setExtraAnamneseQuestions] = useState('')
  const selectedPatient = patients.find(p => p.id === patientId)
  const shouldSendWhatsApp = sendWhatsApp && !!selectedPatient?.phone
  const isAnamnese = instrument?.tags.some(tag => tag.toLowerCase() === 'anamnese') ?? false

  useEffect(() => {
    setExtraAnamneseQuestions('')
  }, [instrument?.id])

  function templateWithExtraAnamneseQuestions() {
    if (!instrument) return ''
    const questions = extraAnamneseQuestions
      .split('\n')
      .map(line => line.trim().replace(/:+$/, ''))
      .filter(Boolean)

    if (!isAnamnese || questions.length === 0) return instrument.template

    return [
      instrument.template.trimEnd(),
      '',
      'PERGUNTAS EXTRAS DA ANAMNESE',
      ...questions.map(question => `${question}:`),
    ].join('\n')
  }

  async function send() {
    if (!instrument || !patientId) return
    try {
      const result = await createAssignment.mutateAsync({
        patientId,
        instrumentId: instrument.id,
        title: instrument.title,
        description: instrument.description,
        category: instrument.category,
        template: templateWithExtraAnamneseQuestions(),
        sendWhatsApp: shouldSendWhatsApp,
      })

      if (!shouldSendWhatsApp) {
        if (result.url) await navigator.clipboard.writeText(result.url)
        toast.success('Link copiado para a área de transferência')
      } else if (result.whatsAppSent) {
        toast.success('Formulário enviado via WhatsApp')
      } else {
        // Formulário criado mas WhatsApp não enviou — copia o link como fallback
        if (result.url) await navigator.clipboard.writeText(result.url)
        const motivo = result.whatsAppError ?? 'WhatsApp não configurado'
        toast(`Link copiado — ${motivo}`, { icon: '⚠️' })
      }
      onClose()
    } catch {
      toast.error('Nao foi possivel enviar o formulario.')
    }
  }

  return (
    <Modal open={!!instrument} onClose={onClose} title="Enviar formulário" size="md">
      <div className="space-y-4">
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
          <p className="text-sm font-semibold text-neutral-800">{instrument?.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">{instrument?.description}</p>
        </div>

        <label className="block">
          <span className="label">Paciente</span>
          <select value={patientId} onChange={e => setPatientId(e.target.value)} className="input-field">
            <option value="">Selecione um paciente</option>
            {patients.map(patient => (
              <option key={patient.id} value={patient.id}>
                {patient.name}{patient.phone ? ` - ${patient.phone}` : ''}
              </option>
            ))}
          </select>
        </label>

        {isAnamnese && (
          <label className="block">
            <span className="label">Perguntas extras da anamnese</span>
            <textarea
              value={extraAnamneseQuestions}
              onChange={e => setExtraAnamneseQuestions(e.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="Uma pergunta por linha. Ex: Como costuma dormir?"
              className="input-field min-h-[120px] resize-y"
            />
            <span className="mt-1 block text-xs text-neutral-400">
              Essas perguntas entram só neste link enviado para o paciente.
            </span>
          </label>
        )}

        <label className="flex items-start gap-3 rounded-2xl border border-neutral-100 bg-white p-4">
          <input
            type="checkbox"
            checked={sendWhatsApp}
            onChange={e => setSendWhatsApp(e.target.checked)}
            disabled={!selectedPatient?.phone}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-medium text-neutral-700">Enviar direto pelo WhatsApp</span>
            <span className="mt-0.5 block text-xs text-neutral-400">
              {selectedPatient?.phone ? `O link será enviado para ${selectedPatient.phone}.` : 'Paciente sem telefone cadastrado; o link será copiado.'}
            </span>
          </span>
        </label>

        <div className="rounded-xl border border-sage-100 bg-sage-50 px-3 py-2">
          <p className="text-xs leading-relaxed text-sage-800">
            O link expira em 7 dias e fica vinculado a este paciente. Depois do envio, a resposta aparece no prontuário.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button
            type="button"
            onClick={send}
            disabled={!patientId || createAssignment.isPending}
            className="btn-primary text-sm"
          >
            {createAssignment.isPending ? 'Enviando...' : shouldSendWhatsApp ? 'Enviar' : 'Gerar link'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function InstrumentosPage() {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<InstrumentCategory | 'all'>('all')
  const [ageFilter, setAgeFilter] = useState<AgeGroup | 'all'>('all')
  const [selected, setSelected] = useState<Instrument | null>(null)
  const [sendingInstrument, setSendingInstrument] = useState<Instrument | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return INSTRUMENTS.filter(inst => {
      const matchCat  = catFilter === 'all' || inst.category === catFilter
      const matchAge  = ageFilter === 'all' || inst.ageGroups.includes(ageFilter as AgeGroup) || inst.ageGroups.includes('all')
      const matchQ    = !q || inst.title.toLowerCase().includes(q) || inst.description.toLowerCase().includes(q) || inst.tags.some(t => t.toLowerCase().includes(q))
      return matchCat && matchAge && matchQ
    })
  }, [search, catFilter, ageFilter])

  return (
    <div className="animate-slide-up space-y-5">
      {/* Header */}
      <div>
        <h1 className="page-title">Instrumentos Clínicos</h1>
        <p className="page-subtitle">Formulários, escalas e registros para apoio clínico</p>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, descrição ou assunto..."
          className="input-field pl-9 py-2.5 text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Categoria */}
        <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
          {ALL_CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCatFilter(value as InstrumentCategory | 'all')}
              className={`flex-none px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                catFilter === value ? 'bg-white shadow-sm font-medium text-neutral-800' : 'text-neutral-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Faixa etária */}
        <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
          {ALL_AGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setAgeFilter(value as AgeGroup | 'all')}
              className={`flex-none px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                ageFilter === value ? 'bg-white shadow-sm font-medium text-neutral-800' : 'text-neutral-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contador */}
      <p className="text-xs text-neutral-400">
        {filtered.length} instrumento{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-sm text-neutral-400">Nenhum instrumento encontrado para os filtros selecionados.</p>
          <button
            onClick={() => { setSearch(''); setCatFilter('all'); setAgeFilter('all') }}
            className="mt-3 text-xs text-sage-600 hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((inst, i) => (
            <InstrumentCard
              key={inst.id}
              instrument={inst}
              index={i}
              onClick={() => setSelected(inst)}
            />
          ))}
        </div>
      )}

      {/* Nota CFP */}
      <p className="text-xs text-neutral-400 border-t border-neutral-100 pt-4">
        Testes psicológicos privativos devem ser utilizados exclusivamente por psicólogas(os) habilitados,
        conforme orientação do CFP e consulta ao{' '}
        <a
          href="https://satepsi.cfp.org.br/"
          target="_blank"
          rel="noreferrer"
          className="text-sage-600 hover:underline"
        >
          SATEPSI
        </a>
        . Alguns instrumentos podem ter regras próprias de uso, tradução e direitos autorais. Confirme a adequação antes de aplicar.
      </p>

      <InstrumentModal
        instrument={selected}
        onClose={() => setSelected(null)}
        onSend={(instrument) => {
          setSelected(null)
          setSendingInstrument(instrument)
        }}
      />
      <SendInstrumentModal instrument={sendingInstrument} onClose={() => setSendingInstrument(null)} />
    </div>
  )
}
