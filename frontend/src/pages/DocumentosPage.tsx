import { useState } from 'react'
import { FilePlus, Shield, Download, Eye, Search, ExternalLink } from 'lucide-react'
import { Documento, DocType, DOC_TYPE_LABELS, DOC_TYPE_ICONS } from '@/types/prontuario'
import { useAuthStore } from '@/store/auth'
import { formatDate } from '@/lib/utils'
import { openCfpVerification } from '@/lib/crp'
import GenerateDocModal from '@/components/features/prontuario/GenerateDocModal'
import { usePatients, useDocuments } from '@/hooks/useApi'
import DocumentPreviewModal from '@/components/features/prontuario/DocumentPreviewModal'

export default function DocumentosPage() {
  const user = useAuthStore(s => s.user)
  const { data: patients = [] } = usePatients()
  const { data: docs = [], isLoading } = useDocuments()
  const [showGenerate, setShowGenerate] = useState(false)
  const [preview, setPreview] = useState<Documento | null>(null)
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

  return (
    <div className="animate-slide-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Documentos</h1>
          <p className="page-subtitle">Certificação digital para seus atendimentos</p>
        </div>
        <button onClick={() => setShowGenerate(true)}
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
            <button key={type} onClick={() => setShowGenerate(true)}
              className="card p-3 text-center hover:shadow-lifted transition-all cursor-pointer hover:border-sage-200 group">
              <span className="text-2xl">{DOC_TYPE_ICONS[type]}</span>
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
          {(Object.entries(DOC_TYPE_LABELS) as [DocType, string][]).map(([type, label]) => (
            <button key={type} onClick={() => setTypeFilter(type)}
              className={`flex-none px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${typeFilter === type ? 'bg-white shadow-sm font-medium text-neutral-800' : 'text-neutral-500'}`}>
              {DOC_TYPE_ICONS[type]} {label.split(' ')[0]}
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
          <div className="card text-center py-12">
            <FilePlus className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="font-medium text-neutral-600">Nenhum documento encontrado</p>
            <p className="text-sm text-neutral-400 mt-1 mb-4">Gere declarações, recibos e relatórios com assinatura digital.</p>
            <button onClick={() => setShowGenerate(true)} className="btn-primary text-sm">
              Gerar primeiro documento
            </button>
          </div>
        ) : filtered.map(doc => (
          <DocCard key={doc.id} doc={doc}
            onPreview={() => setPreview(doc)} />
        ))}
      </div>

      <GenerateDocModal
        open={showGenerate}
        onClose={() => setShowGenerate(false)}
        onGenerate={handleGenerate}
        patients={patients}
        user={user}
      />

      <DocumentPreviewModal
        doc={preview}
        open={!!preview}
        onClose={() => setPreview(null)}
      />
    </div>
  )
}

function DocCard({ doc, onPreview }: { doc: Documento; onPreview: () => void }) {
  return (
    <div className="card flex items-center gap-4 p-4 hover:shadow-lifted transition-all">
      <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center text-xl shrink-0">
        {DOC_TYPE_ICONS[doc.type]}
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
        <button
          className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-sage-600 transition-colors"
          title="Baixar"
          onClick={() => window.print()}>
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
