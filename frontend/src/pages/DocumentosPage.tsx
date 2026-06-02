import { useState } from 'react'
import {
  FilePlus, Shield, Download, Eye, Search, ExternalLink, Trash2,
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

const CLINICAL_MODELS = [
  {
    title: 'Anamnese psicologica',
    description: 'Queixa principal, historia, contexto familiar, saude, rotina, rede de apoio e objetivos iniciais.',
    template: `ANAMNESE PSICOLOGICA

Identificacao:
Queixa principal:
Historico da demanda:
Contexto familiar e social:
Saude, medicacoes e acompanhamentos:
Rotina, sono, alimentacao e trabalho/estudo:
Rede de apoio:
Objetivos iniciais do acompanhamento:
Observacoes clinicas relevantes:`,
    icon: ClipboardCheck,
  },
  {
    title: 'Evolucao de sessao',
    description: 'Data, demanda trabalhada, intervencoes, resposta observada, combinados e proximos passos.',
    template: `EVOLUCAO DE SESSAO

Data:
Pessoa atendida:
Demanda trabalhada:
Intervencoes realizadas:
Resposta observada:
Combinados/orientacoes:
Pontos para acompanhamento:
Proxima sessao:`,
    icon: ClipboardPen,
  },
  {
    title: 'Plano terapeutico',
    description: 'Hipoteses iniciais, objetivos, frequencia, estrategias, indicadores de progresso e revisoes.',
    template: `PLANO TERAPEUTICO

Demanda inicial:
Hipoteses clinicas iniciais:
Objetivos terapeuticos:
Frequencia sugerida:
Estrategias/intervencoes planejadas:
Indicadores de progresso:
Pontos de revisao:
Cuidados eticos e de sigilo:`,
    icon: ListChecks,
  },
  {
    title: 'Contrato terapeutico',
    description: 'Honorarios, faltas, cancelamento, sigilo, comunicacao, emergencias e protecao de dados.',
    template: `CONTRATO TERAPEUTICO / COMBINADOS

Frequencia e duracao das sessoes:
Honorarios e forma de pagamento:
Politica de faltas e cancelamentos:
Canais e horarios de comunicacao:
Sigilo profissional e suas excecoes legais/eticas:
Uso e protecao de dados pessoais:
Condutas em situacoes de urgencia/emergencia:
Aceite da pessoa atendida:`,
    icon: FileSignature,
  },
  {
    title: 'Rastreio de risco',
    description: 'Sinais de alerta, fatores de protecao, rede acionavel e plano de seguranca quando necessario.',
    template: `RASTREIO DE RISCO

Data:
Sinais de alerta relatados/observados:
Fatores de risco:
Fatores de protecao:
Rede de apoio acionavel:
Orientacoes combinadas:
Plano de seguranca, quando necessario:
Encaminhamentos/contatos de emergencia:
Reavaliacao prevista:`,
    icon: ShieldAlert,
  },
]

export default function DocumentosPage() {
  const user = useAuthStore(s => s.user)
  const { data: patients = [] } = usePatients()
  const { data: docs = [], isLoading } = useDocuments()
  const deleteDoc = useDeleteDocument()
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

  async function downloadPdf(doc: Documento) {
    try {
      const response = await api.get(`/documents/${doc.id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `${doc.signCode}-${doc.type}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao baixar PDF')
    }
  }

  async function copyClinicalModel(title: string, template: string) {
    await navigator.clipboard.writeText(template)
    toast.success(`${title} copiado`)
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
          <p className="text-sm font-medium text-neutral-600">Modelos de instrumentos clinicos</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
          {CLINICAL_MODELS.map(({ title, description, template, icon: Icon }) => (
            <div key={title} className="card flex flex-col p-3">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-sage-50 text-sage-600">
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium text-neutral-800">{title}</p>
              <p className="mt-1 flex-1 text-xs leading-snug text-neutral-400">{description}</p>
              <button
                type="button"
                onClick={() => copyClinicalModel(title, template)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-sage-600 hover:text-sage-700"
              >
                <ClipboardCopy className="w-3.5 h-3.5" />
                Copiar modelo
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          Testes psicologicos e instrumentos privativos devem ser usados apenas por psicologas(os), conforme avaliacao e orientacao do CFP/SATEPSI.
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
              onAction={() => setShowGenerate(true)}
              className="py-12"
            />
          </div>
        ) : filtered.map(doc => (
          <DocCard key={doc.id} doc={doc}
            onPreview={() => setPreview(doc)}
            onDownload={() => downloadPdf(doc)}
            onDelete={async () => {
              if (!confirm(`Excluir "${doc.title}"? Esta ação não pode ser desfeita.`)) return
              try {
                await deleteDoc.mutateAsync(doc.id)
                toast.success('Documento excluído')
              } catch {
                toast.error('Erro ao excluir documento')
              }
            }}
          />
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

function DocCard({ doc, onPreview, onDownload, onDelete }: {
  doc: Documento
  onPreview: () => void
  onDownload: () => void
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
        <button
          className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-sage-600 transition-colors"
          title="Baixar"
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
