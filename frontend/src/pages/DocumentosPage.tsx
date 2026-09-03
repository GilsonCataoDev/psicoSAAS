import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  FilePlus, Shield, Download, Eye, Search, ExternalLink, Trash2, Copy,
  FileSignature, LoaderCircle,
} from 'lucide-react'
import { Documento, DocumentoListItem, DocType, docTypeLabels, DOC_TYPE_ICONS } from '@/types/prontuario'
import { useAuthStore } from '@/store/auth'
import { councilLabel } from '@/lib/professions'
import { formatDate } from '@/lib/utils'
import { openCfpVerification } from '@/lib/crp'
import { usePatients, useDocuments, useDeleteDocument } from '@/hooks/useApi'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import EmptyState from '@/components/ui/EmptyState'
import UseCogniaIcon from '@/components/ui/UseCogniaIcon'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { hasPsychologyModules } from '@/lib/professions'

const GenerateDocModal = lazy(() => import('@/components/features/prontuario/GenerateDocModal'))
const DocumentPreviewModal = lazy(() => import('@/components/features/prontuario/DocumentPreviewModal'))

function ModalLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/25 backdrop-blur-[1px]">
      <div className="rounded-xl bg-white p-4 shadow-xl" role="status" aria-label="Carregando">
        <LoaderCircle className="h-6 w-6 animate-spin text-sage-600" />
      </div>
    </div>
  )
}

export default function DocumentosPage() {
  const [searchParams] = useSearchParams()
  const user = useAuthStore(s => s.user)
  // A resolucao do CFP so vale para psicologia.
  const showCfp = hasPsychologyModules(user?.profession)
  const labels = docTypeLabels(user?.profession)
  const [showGenerate, setShowGenerate] = useState(false)
  const { data: patients = [], isLoading: patientsLoading } = usePatients({ enabled: showGenerate })
  const { data: docs = [], isLoading } = useDocuments()
  const deleteDoc = useDeleteDocument()
  const [generateType, setGenerateType] = useState<DocType | undefined>(undefined)
  const [preview, setPreview] = useState<Documento | null>(null)
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null)
  const [docToDelete, setDocToDelete] = useState<DocumentoListItem | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocType | 'all'>('all')

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setGenerateType(undefined)
      setShowGenerate(true)
    }
  }, [searchParams])

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return docs.filter(d => {
      const matchSearch = !normalizedSearch ||
        d.patientName.toLowerCase().includes(normalizedSearch) ||
        d.title.toLowerCase().includes(normalizedSearch)
      const matchType = typeFilter === 'all' || d.type === typeFilter
      return matchSearch && matchType
    })
  }, [docs, search, typeFilter])

  function handleGenerate(doc: Documento) {
    // O GenerateDocModal já chama a API; ao fechar, revalida automaticamente via queryKey
    setPreview(doc)
  }

  async function openPreview(doc: DocumentoListItem) {
    setPreviewLoadingId(doc.id)
    try {
      const { data } = await api.get<Documento>(`/documents/${doc.id}`)
      setPreview(data)
    } catch {
      toast.error('Não foi possível abrir o documento.')
    } finally {
      setPreviewLoadingId(null)
    }
  }

  async function downloadPdf(doc: DocumentoListItem) {
    try {
      const response = await api.get(`/documents/${doc.id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `${doc.signCode}-${doc.type}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err: any) {
      const message = err?.response?.status === 403
        ? 'Seu acesso atual não permite baixar este PDF.'
        : 'Erro ao baixar PDF'
      toast.error(message)
    }
  }

  function copyDocLink(doc: DocumentoListItem) {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '')
    const url = `${window.location.origin}${base}/verificar/${encodeURIComponent(doc.signCode)}`
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
              {user?.name ?? 'Profissional'}{user?.crp ? ` · ${councilLabel(user.profession)} ${user.crp}` : ''}
            </p>
            <p className="text-sage-200 text-xs mt-1">
              Documentos assinados com código único verificável{showCfp ? ' · Válidos conforme CFP Res. 006/2019' : ''}
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
          {(Object.entries(labels) as [DocType, string][]).map(([type, label]) => (
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
          {(Object.entries(labels) as [DocType, string][]).map(([type, label]) => (
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
              icon={<FileSignature className="h-7 w-7" strokeWidth={1.8} />}
              title="Nenhum documento encontrado"
              description="Gere declaracoes, recibos e relatorios em PDF com assinatura digital."
              actionLabel="Gerar primeiro documento"
              onAction={() => { setGenerateType(undefined); setShowGenerate(true) }}
              className="py-12"
            />
          </div>
        ) : filtered.map(doc => (
          <DocCard key={doc.id} doc={doc}
            previewLoading={previewLoadingId === doc.id}
            onPreview={() => openPreview(doc)}
            onDownload={() => downloadPdf(doc)}
            onCopyLink={() => copyDocLink(doc)}
            onDelete={() => setDocToDelete(doc)}
          />
        ))}
      </div>

      <Suspense fallback={<ModalLoadingOverlay />}>
        {showGenerate && !patientsLoading && (
          <GenerateDocModal
            open
            onClose={() => setShowGenerate(false)}
            onGenerate={handleGenerate}
            patients={patients}
            user={user}
            initialType={generateType}
          />
        )}

        {preview && (
          <DocumentPreviewModal
            doc={preview}
            open
            onClose={() => setPreview(null)}
          />
        )}
      </Suspense>
      {showGenerate && patientsLoading && <ModalLoadingOverlay />}

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

function DocCard({ doc, previewLoading, onPreview, onDownload, onCopyLink, onDelete }: {
  doc: DocumentoListItem
  previewLoading: boolean
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
          <span className={`text-xs flex items-center gap-1 ${doc.needsReview ? 'text-amber-600' : 'text-sage-600'}`}>
            <Shield className="w-3 h-3" />{doc.needsReview ? 'Revisão necessária' : 'Assinado'}
          </span>
          <span className="text-neutral-200">·</span>
          <span className="text-xs font-mono text-neutral-400">{doc.signCode}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onPreview} disabled={previewLoading}
          className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-sage-600 transition-colors"
          title="Visualizar">
          {previewLoading
            ? <LoaderCircle className="w-4 h-4 animate-spin" />
            : <Eye className="w-4 h-4" />}
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
