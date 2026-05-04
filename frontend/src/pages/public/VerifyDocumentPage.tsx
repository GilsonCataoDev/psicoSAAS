import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Shield, CheckCircle2, XCircle, Loader2, ExternalLink, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import BrandLogo from '@/components/ui/BrandLogo'

type DocType = 'declaracao' | 'recibo' | 'relatorio' | 'atestado' | 'encaminhamento'

const TYPE_LABELS: Record<DocType, string> = {
  declaracao:    'Declaração de Comparecimento',
  recibo:        'Recibo de Pagamento',
  relatorio:     'Relatório Psicológico',
  atestado:      'Atestado Psicológico',
  encaminhamento:'Carta de Encaminhamento',
}

interface VerifyResult {
  valid: boolean
  document?: {
    signCode: string
    type: DocType
    title: string
    patientName: string
    psychologistName: string
    psychologistCrp: string
    signedAt: string
    createdAt: string
    fingerprint?: string
    algorithm?: string
    verificationUrl?: string
  }
}

export default function VerifyDocumentPage() {
  const { code } = useParams<{ code: string }>()
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!code) { setLoading(false); return }

    async function verify() {
      try {
        const { data } = await api.get(`/documents/verify/${code}`)
        setResult(data)
      } catch {
        setResult({ valid: false })
      } finally {
        setLoading(false)
      }
    }

    verify()
  }, [code])

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 via-white to-mist-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-neutral-100 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <BrandLogo className="w-auto h-9" />
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <Shield className="w-3.5 h-3.5 text-sage-400" />
            Verificação de autenticidade
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-12">

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 text-sage-400 animate-spin mx-auto mb-4" />
            <p className="text-neutral-500">Verificando autenticidade do documento...</p>
            <p className="text-xs text-neutral-400 mt-1 font-mono">{code}</p>
          </div>
        )}

        {/* Resultado válido */}
        {!loading && result?.valid && result.document && (
          <div className="space-y-6 animate-slide-up">
            {/* Badge de autenticidade */}
            <div className="bg-white rounded-3xl shadow-card border border-emerald-100 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold">Documento autêntico ✓</p>
                  <p className="text-emerald-100 text-sm mt-0.5">
                    Assinatura digital verificada com sucesso
                  </p>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Tipo de documento */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-sage-50 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="w-4.5 h-4.5 text-sage-600" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400">Tipo de documento</p>
                    <p className="font-medium text-neutral-800">
                      {TYPE_LABELS[result.document.type] ?? result.document.type}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-neutral-100" />

                {/* Detalhes */}
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { label: 'Emitido para', value: result.document.patientName },
                    { label: 'Psicólogo(a) responsável', value: result.document.psychologistName },
                    { label: 'CRP', value: result.document.psychologistCrp },
                    {
                      label: 'Data de assinatura',
                      value: new Date(result.document.signedAt).toLocaleDateString('pt-BR', {
                        dateStyle: 'full',
                      }),
                    },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between gap-4 py-1.5 border-b border-neutral-50 last:border-0">
                      <p className="text-sm text-neutral-400">{item.label}</p>
                      <p className="text-sm font-medium text-neutral-800 text-right">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Código */}
                <div className="bg-neutral-50 rounded-2xl p-4 text-center">
                  <p className="text-xs text-neutral-400 mb-1">Código de verificação</p>
                  <p className="font-mono text-lg font-bold text-neutral-800 tracking-wider">
                    {result.document.signCode}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Assinado com {result.document.algorithm ?? 'HMAC-SHA256'} · CFP Res. 006/2019
                  </p>
                  {result.document.fingerprint && (
                    <p className="text-[11px] text-neutral-400 mt-1 font-mono">
                      Hash: {result.document.fingerprint}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Info legal */}
            <div className="bg-sage-50 rounded-2xl p-4 text-sm text-sage-700 space-y-1">
              <p className="font-medium">Sobre esta verificação</p>
              <p className="text-sage-600 text-xs leading-relaxed">
                Este documento foi gerado e assinado digitalmente pela plataforma UseCognia.
                A assinatura é verificada por código HMAC-SHA256, garantindo que o conteúdo
                não foi alterado desde a emissão. Válido conforme CFP Resolução 006/2019.
              </p>
            </div>
          </div>
        )}

        {/* Resultado inválido */}
        {!loading && result !== null && !result.valid && (
          <div className="text-center py-8 space-y-5 animate-slide-up">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-rose-400" />
            </div>
            <div>
              <p className="font-semibold text-neutral-800 text-xl">Documento não encontrado</p>
              <p className="text-neutral-500 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                O código <strong className="font-mono">{code}</strong> não corresponde a nenhum
                documento em nossa base, ou o código foi adulterado.
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-sm text-rose-700 text-left max-w-sm mx-auto space-y-2">
              <p className="font-medium">Possíveis causas:</p>
              <ul className="list-disc list-inside space-y-1 text-rose-600 text-xs">
                <li>Código digitado incorretamente</li>
                <li>Documento emitido fora desta plataforma</li>
                <li>Conteúdo do documento foi modificado</li>
              </ul>
            </div>

            <p className="text-sm text-neutral-400">
              Em caso de dúvida, entre em contato com o psicólogo responsável.
            </p>
          </div>
        )}

      </main>

      <footer className="text-center py-6 text-xs text-neutral-400 space-y-1">
        <p>UseCognia · Documentacao clinica segura</p>
        <a
          href="https://cadastro.cfp.org.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-sage-600 transition-colors"
        >
          Verificar registro no CFP
          <ExternalLink className="w-3 h-3" />
        </a>
      </footer>
    </div>
  )
}
