import { useState } from 'react'
import {
  FilePlus, Shield, Download, Eye, Search, ExternalLink, Trash2, Copy,
  ClipboardCheck, ClipboardCopy, ClipboardPen, FileSignature, ListChecks, ShieldAlert,
} from 'lucide-react'
import { Documento, DocType, DOC_TYPE_LABELS, DOC_TYPE_ICONS } from '@/types/prontuario'
import { useAuthStore } from '@/store/auth'
import { formatDate } from '@/lib/utils'
import { openCfpVerification } from '@/lib/crp'
import GenerateDocModal from '@/components/features/prontuario/GenerateDocModal'
import { usePatients, useDocuments, useDeleteDocument } from '@/hooks/useApi'
import DocumentPreviewModal from '@/components/features/prontuario/DocumentPreviewModal'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import EmptyState from '@/components/ui/EmptyState'
import UseCogniaIcon from '@/components/ui/UseCogniaIcon'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const CLINICAL_MODELS = [
  {
    title: 'Anamnese psicológica',
    description: 'Queixa principal, história, contexto familiar, saúde, rotina, rede de apoio e objetivos iniciais.',
    template: `ANAMNESE PSICOLÓGICA

Identificação:
Queixa principal:
Histórico da demanda:
Contexto familiar e social:
Saúde, medicações e acompanhamentos:
Rotina, sono, alimentação e trabalho/estudo:
Rede de apoio:
Objetivos iniciais do acompanhamento:
Observações clínicas relevantes:`,
    icon: ClipboardCheck,
  },
  {
    title: 'Evolução de sessão',
    description: 'Data, demanda trabalhada, intervenções, resposta observada, combinados e próximos passos.',
    template: `EVOLUÇÃO DE SESSÃO

Data:
Pessoa atendida:
Demanda trabalhada:
Intervenções realizadas:
Resposta observada:
Combinados/orientações:
Pontos para acompanhamento:
Próxima sessão:`,
    icon: ClipboardPen,
  },
  {
    title: 'Plano terapêutico',
    description: 'Hipóteses iniciais, objetivos, frequência, estratégias, indicadores de progresso e revisões.',
    template: `PLANO TERAPÊUTICO

Demanda inicial:
Hipóteses clínicas iniciais:
Objetivos terapêuticos:
Frequência sugerida:
Estratégias/intervenções planejadas:
Indicadores de progresso:
Pontos de revisão:
Cuidados éticos e de sigilo:`,
    icon: ListChecks,
  },
  {
    title: 'Contrato terapêutico',
    description: 'Honorários, faltas, cancelamento, sigilo, comunicação, emergências e proteção de dados.',
    template: `CONTRATO TERAPÊUTICO / COMBINADOS

Frequência e duração das sessões:
Honorários e forma de pagamento:
Política de faltas e cancelamentos:
Canais e horários de comunicação:
Sigilo profissional e suas exceções legais/éticas:
Uso e proteção de dados pessoais:
Condutas em situações de urgência/emergência:
Aceite da pessoa atendida:`,
    icon: FileSignature,
  },
  {
    title: 'Rastreio de risco',
    description: 'Sinais de alerta, fatores de proteção, rede acionável e plano de segurança quando necessário.',
    template: `RASTREIO DE RISCO

Data:
Sinais de alerta relatados/observados:
Fatores de risco:
Fatores de proteção:
Rede de apoio acionável:
Orientações combinadas:
Plano de segurança, quando necessário:
Encaminhamentos/contatos de emergência:
Reavaliação prevista:`,
    icon: ShieldAlert,
  },
]

export default function DocumentosPage() {
  const user = useAuthStore(s => s.user)
  const { data: patients = [] } = usePatients()
  const { data: docs = [], isLoading } = useDocuments()
  const deleteDoc = useDeleteDocument()
  const [showGenerate, setShowGenerate] = useState(false)
  const [generateType, setGenerateType] = useState<DocType | undefined>(undefined)
  const [preview, setPreview] = useState<Documento | null>(null)
  const [clinicalPreview, setClinicalPreview] = useState<typeof CLINICAL_MODELS[number] | null>(null)
  const [docToDelete, setDocToDelete] = useState<Documento | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocType | 'all'>('all')

  const filtered = docs.filter(d => {
    const matchSearch = d.patientName.toLowerCase().includes(search.toLowerCase()) ||
                        d.title.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || d.type === typeFilter
    return matchSearch && matchType
  })

  function handleGenerate(doc: Documento) {
    // O GenerateDocModal já chama a API; ao fechar, revalida automaticamente via queryKey
    setPreview(doc)
  }

  async function downloadPdf(doc: Documento) {
    try {
      const response = await api.get(`/documents/${doc.id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `${doc.signCode}-${doc.type}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      const message = err?.response?.status === 403
        ? 'Seu acesso atual não permite baixar este PDF.'
        : 'Erro ao baixar PDF'
      toast.error(message)
    }
  }

  function copyDocLink(doc: Documento) {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '')
    const url = `${window.location.origin}${base}/#/verificar/${encodeURIComponent(doc.signCode)}`
    navigator.clipboard.writeText(url).then(
      () => toast.success('Link copiado!'),
      () => toast.error('Não foi possível copiar o link.'),
    )
  }

  async function handleDeleteDocument() {
    if (!docToDelete) return
    try {
      await deleteDoc.mutateAsync(docToDelete.id)
      toast.success('Documento excluído')
      setDocToDelete(null)
    } catch {
      toast.error('Erro ao excluir documento')
    }
  }

  return (
    <div className="animate-slide-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Documentos</h1>
          <p className="page-subtitle">Certificação digital para seus atendimentos</p>
        </div>
        <button onClick={() => { setGenerateType(undefined); setShowGenerate(true) }}
          className="btn-primary flex items-center gap-2">
          <FilePlus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo documento</span>
        </button>
      </div>

      {/* Assinatura digital info */}
      <div className="card bg-gradient-to-r from-sage-500 to-sage-600 text-white border-0">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium">Certificação digital ativa</p>
            <p className="text-sage-100 text-sm mt-0.5">
              {user?.name ?? 'Psicólogo(a)'} · CRP {user?.crp ?? '00/000000'}
            </p>
            <p className="text-sage-200 text-xs mt-1">
              Documentos assinados com código único verificável · Válidos conforme CFP Res. 006/2019
            </p>
            <button
              type="button"
              onClick={openCfpVerification}
              className="mt-2 inline-flex items-center gap-1 text-xs text-white/80 hover:text-white hover:underline transition-colors"
            >
              Verificar registro ativo no portal CFP
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Tipos de documento */}
      <div>
        <p className="text-sm font-medium text-neutral-600 mb-3">Gerar documento rápido</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {(Object.entries(DOC_TYPE_LABELS) as [DocType, string][]).map(([type, label]) => (
            <button key={type} onClick={() => { setGenerateType(type); setShowGenerate(true) }}
              className="card p-3 text-center hover:shadow-lifted hover:-translate-y-px transition-all cursor-pointer hover:border-sage-200 group">
              <UseCogniaIcon name={DOC_TYPE_ICONS[type]} size={32} />
              <p className="text-xs font-medium text-neutral-600 mt-1.5 leading-tight group-hover:text-sage-700">
                {label}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-neutral-600">Modelos de instrumentos clínicos</p>
          <a
            href="https://satepsi.cfp.org.br/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-sage-600 hover:text-sage-700 hover:underline"
          >
            Consultar SATEPSI
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {CLINICAL_MODELS.map(({ title, description, template, icon: Icon }, i) => {
            const colors = [
              'bg-sage-50 text-sage-600 ring-sage-100',
              'bg-violet-50 text-violet-600 ring-violet-100',
              'bg-sky-50 text-sky-600 ring-sky-100',
              'bg-amber-50 text-amber-600 ring-amber-100',
              'bg-rose-50 text-rose-600 ring-rose-100',
            ]
            const fieldCount = template.split('\n').filter(l => l.trim().endsWith(':')).length
            return (
              <button
                key={title}
                type="button"
                onClick={() => setClinicalPreview({ title, description, template, icon: Icon })}
                className="card group flex flex-col items-start gap-3 p-4 text-left hover:shadow-lifted hover:-translate-y-px transition-all duration-200 hover:border-sage-200 cursor-pointer"
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${colors[i % colors.length]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-800 leading-tight">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-400 line-clamp-2">{description}</p>
                </div>
                <div className="flex w-full items-center justify-between pt-1 border-t border-neutral-100">
                  <span className="text-[11px] text-neutral-300">{fieldCount} campos</span>
                  <span className="text-xs font-medium text-sage-600 group-hover:text-sage-700 flex items-center gap-1">
                    <ClipboardCopy className="w-3 h-3" />
                    Abrir
                  </span>
                </div>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          Testes psicológicos e instrumentos privativos devem ser usados apenas por psicólogas(os), conforme avaliação e orientação do CFP/SATEPSI.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por pessoa ou documento..."
            className="input-field pl-9 py-2.5 text-sm" />
        </div>
        <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
          <button onClick={() => setTypeFilter('all')}
            className={`flex-none px-3 py-1.5 rounded-lg text-xs transition-all ${typeFilter === 'all' ? 'bg-white shadow-sm font-medium text-neutral-800' : 'text-neutral-500'}`}>
            Todos
          </button>
          {(Object.entries(DOC_TYPE_LABELS) as [DocType, string][]).map(([type, label]) => (
            <button key={type} onClick={() => setTypeFilter(type)}
              className={`flex-none px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${typeFilter === type ? 'bg-white shadow-sm font-medium text-neutral-800' : 'text-neutral-500'}`}>
              <span className="inline-flex items-center gap-1.5">
                <UseCogniaIcon name={DOC_TYPE_ICONS[type]} size={24} />
                {label.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista de documentos */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="card text-center py-8">
            <div className="w-6 h-6 border-2 border-sage-400 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              image="empty-state-no-documents.png"
              title="Nenhum documento encontrado"
              description="Gere declaracoes, recibos e relatorios com assinatura digital."
              actionLabel="Gerar primeiro documento"
              onAction={() => { setGenerateType(undefined); setShowGenerate(true) }}
              className="py-12"
            />
          </div>
        ) : filtered.map(doc => (
          <DocCard key={doc.id} doc={doc}
            onPreview={() => setPreview(doc)}
            onDownload={() => downloadPdf(doc)}
            onCopyLink={() => copyDocLink(doc)}
            onDelete={() => setDocToDelete(doc)}
          />
        ))}
      </div>

      <GenerateDocModal
        open={showGenerate}
        onClose={() => setShowGenerate(false)}
        onGenerate={handleGenerate}
        patients={patients}
        user={user}
        initialType={generateType}
      />

      <DocumentPreviewModal
        doc={preview}
        open={!!preview}
        onClose={() => setPreview(null)}
      />

      <ClinicalModelModal
        model={clinicalPreview}
        onClose={() => setClinicalPreview(null)}
      />
      <ConfirmDialog
        open={!!docToDelete}
        title="Excluir documento"
        description={`Excluir "${docToDelete?.title ?? 'documento'}"? O PDF e o codigo de verificacao deixam de ficar disponiveis.`}
        confirmLabel="Excluir documento"
        loading={deleteDoc.isPending}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleDeleteDocument}
      />
    </div>
  )
}

function renderTemplateLine(line: string, idx: number) {
  if (!line.trim()) return <div key={idx} className="h-3" />

  // ALL CAPS section header (most words uppercase, contains only letters/spaces/accented chars)
  const isHeader = line === line.toUpperCase() && line.trim().length > 2 && /^[A-ZÁÀÃÂÉÊÍÓÔÕÚÜÇ\s/]+$/.test(line.trim())
  if (isHeader) {
    return (
      <div key={idx} className="flex items-center gap-3 pt-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">{line.trim()}</p>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>
    )
  }

  // "Label: content" or "Label:"
  const colonIdx = line.indexOf(':')
  if (colonIdx > 0) {
    const label = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    return (
      <div key={idx} className="grid grid-cols-[160px_1fr] gap-3 items-end py-1 border-b border-dashed border-neutral-150">
        <span className="text-[11px] font-semibold text-neutral-500 pb-0.5 leading-tight">{label}</span>
        <span className="text-sm text-neutral-700 pb-0.5 min-h-[1.5rem]">
          {value || <span className="text-neutral-200 select-none pointer-events-none">_</span>}
        </span>
      </div>
    )
  }

  return <p key={idx} className="text-xs text-neutral-400 italic">{line}</p>
}

function ClinicalModelModal({ model, onClose }: {
  model: typeof CLINICAL_MODELS[number] | null
  onClose: () => void
}) {
  if (!model) return null

  const lines = model.template.split('\n')
  const fieldCount = lines.filter(l => l.trim().endsWith(':')).length

  function escHtml(v: string) {
    return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  function printModel() {
    if (!model) return
    const win = window.open('', '_blank')
    if (!win) { toast.error('Não foi possível abrir a janela de impressão.'); return }

    const rows = model.template.split('\n').map(line => {
      if (!line.trim()) return '<div style="height:10px"></div>'
      const isHeader = line === line.toUpperCase() && line.trim().length > 2 && /^[A-ZÁÀÃÂÉÊÍÓÔÕÚÜÇ\s/]+$/.test(line.trim())
      if (isHeader) return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0 4px"><span style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b7280">${escHtml(line.trim())}</span><div style="flex:1;height:1px;background:#d1d5db"></div></div>`
      const ci = line.indexOf(':')
      if (ci > 0) {
        const label = escHtml(line.slice(0, ci).trim())
        const value = escHtml(line.slice(ci + 1).trim())
        return `<div style="display:grid;grid-template-columns:150px 1fr;gap:8px;padding:6px 0;border-bottom:1px dashed #e5e7eb"><span style="font-size:9.5px;font-weight:600;color:#6b7280;padding-top:2px">${label}</span><span style="font-size:11px;color:#374151;padding-bottom:4px">${value || ''}</span></div>`
      }
      return `<p style="font-size:9.5px;color:#9ca3af;font-style:italic;margin:2px 0">${escHtml(line)}</p>`
    }).join('')

    win.document.write(`<!doctype html><html><head><title>${escHtml(model.title)}</title>
<style>
@page{size:A4;margin:16mm 14mm}
*{box-sizing:border-box}
html,body{width:210mm;min-height:297mm;margin:0;background:#fff;font-family:Arial,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sheet{width:100%;padding:0}
.header{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:16px}
.title{font-size:14px;font-weight:700;margin:0 0 2px}
.subtitle{font-size:9.5px;color:#6b7280;margin:0}
.meta{display:flex;gap:16px;margin-top:8px}
.meta span{font-size:9px;color:#9ca3af;border:1px solid #e5e7eb;border-radius:4px;padding:2px 6px}
</style>
</head><body><div class="sheet">
<div class="header">
  <p class="title">${escHtml(model.title)}</p>
  <p class="subtitle">${escHtml(model.description)}</p>
  <div class="meta">
    <span>Profissional: _______________________________</span>
    <span>CRP: __________</span>
    <span>Data: ____/____/________</span>
  </div>
</div>
${rows}
</div></body></html>`)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 150)
  }

  return (
    <Modal open={!!model} onClose={onClose} title={model.title} size="lg">
      <div className="space-y-4">
        {/* Header info */}
        <div className="flex items-start gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3">
          <model.icon className="w-5 h-5 text-sage-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-neutral-600 leading-relaxed">{model.description}</p>
            <p className="mt-1 text-xs text-neutral-400">{fieldCount} campos para preenchimento</p>
          </div>
        </div>

        {/* Document form */}
        <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
          {/* Document header strip */}
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

          {/* Fields */}
          <div className="px-5 py-4 space-y-0.5">
            {lines.map((line, idx) => renderTemplateLine(line, idx))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-400">
            Instrumento de apoio clínico · não substitui prontuário oficial
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Fechar</button>
            <button type="button" onClick={printModel} className="btn-primary text-sm flex items-center gap-2">
              <Download className="w-4 h-4" />
              Imprimir / PDF
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function DocCard({ doc, onPreview, onDownload, onCopyLink, onDelete }: {
  doc: Documento
  onPreview: () => void
  onDownload: () => void
  onCopyLink: () => void
  onDelete: () => void
}) {
  return (
    <div className="card flex items-center gap-4 p-4 hover:shadow-lifted hover:-translate-y-px transition-all duration-200 group">
      <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center text-xl shrink-0">
        <UseCogniaIcon name={DOC_TYPE_ICONS[doc.type]} size={32} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-neutral-800 truncate">{doc.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-neutral-400">{formatDate(doc.signedAt)}</span>
          <span className="text-neutral-200">·</span>
          <span className="text-xs text-sage-600 flex items-center gap-1">
            <Shield className="w-3 h-3" />Assinado
          </span>
          <span className="text-neutral-200">·</span>
          <span className="text-xs font-mono text-neutral-400">{doc.signCode}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onPreview}
          className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-sage-600 transition-colors"
          title="Visualizar">
          <Eye className="w-4 h-4" />
        </button>
        <button onClick={onCopyLink}
          className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-sage-600 transition-colors"
          title="Copiar link de verificação">
          <Copy className="w-4 h-4" />
        </button>
        <button
          className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-sage-600 transition-colors"
          title="Baixar PDF"
          onClick={onDownload}>
          <Download className="w-4 h-4" />
        </button>
        <button onClick={onDelete}
          className="p-2 rounded-lg hover:bg-rose-50 text-neutral-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
          title="Excluir documento">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
