import { useEffect, useMemo, useState } from 'react'
import * as QRCode from 'qrcode'
import { Printer, Download, Shield, CheckCircle, ExternalLink } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Documento, DOC_TYPE_LABELS } from '@/types/prontuario'

function getVerificationUrl(signCode: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${window.location.origin}${base}/#/verificar/${encodeURIComponent(signCode)}`
}

export default function DocumentPreviewModal({
  doc,
  open,
  onClose,
}: {
  doc: Documento | null
  open: boolean
  onClose: () => void
}) {
  const [qrCode, setQrCode] = useState('')

  const verificationUrl = useMemo(
    () => doc ? getVerificationUrl(doc.signCode) : '',
    [doc],
  )

  useEffect(() => {
    if (!verificationUrl) return
    QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 160,
      color: { dark: '#1c1c1a', light: '#ffffff' },
    }).then(setQrCode).catch(() => setQrCode(''))
  }, [verificationUrl])

  if (!doc) return null

  const signedDate = new Date(doc.signedAt).toLocaleDateString('pt-BR', { dateStyle: 'long' })
  const crp = doc.psychologistCrp ?? doc.crp

  return (
    <Modal open={open} onClose={onClose} title={DOC_TYPE_LABELS[doc.type]} size="lg">
      <div className="space-y-4">
        <div className="border border-neutral-200 rounded-2xl overflow-hidden">
          <div className="bg-neutral-50 border-b border-neutral-100 px-6 py-4 text-center">
            <p className="font-display text-lg font-medium text-neutral-800">
              {DOC_TYPE_LABELS[doc.type].toUpperCase()}
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">
              Conselho Federal de Psicologia - Res. 006/2019
            </p>
          </div>

          <div className="px-6 py-5">
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
              {doc.content}
            </p>
          </div>

          <div className="border-t border-dashed border-neutral-200 mx-6 mb-0" />
          <div className="px-6 py-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="w-40 h-px border-t-2 border-neutral-400 mb-2" />
                <p className="font-medium text-sm text-neutral-800">{doc.psychologistName}</p>
                <p className="text-xs text-neutral-500">Psicologo(a) - CRP {crp}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{signedDate}</p>
              </div>

              <div className="flex flex-col items-center gap-1">
                <a
                  href={verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Verificar autenticidade"
                  className="w-16 h-16 border-2 border-neutral-200 rounded-xl flex items-center justify-center bg-white overflow-hidden hover:border-sage-300 transition-colors"
                >
                  {qrCode ? (
                    <img src={qrCode} alt={`QR Code de verificacao ${doc.signCode}`} className="w-full h-full" />
                  ) : (
                    <Shield className="w-6 h-6 text-neutral-300" />
                  )}
                </a>
                <p className="text-[9px] text-neutral-400">Verificar autenticidade</p>
              </div>
            </div>

            <div className="bg-sage-50 border border-sage-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-sage-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-sage-700 font-medium">Documento assinado digitalmente</p>
                <p className="text-xs font-mono text-sage-600 mt-0.5">Codigo: {doc.signCode}</p>
              </div>
              <a
                href={verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Verificar autenticidade"
                className="p-1 hover:text-sage-600 text-sage-400 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <Shield className="w-4 h-4 text-sage-400 shrink-0" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => window.print()}
            className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm">
            <Printer className="w-4 h-4" />Imprimir
          </button>
          <button onClick={() => window.print()}
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
            <Download className="w-4 h-4" />Baixar PDF
          </button>
        </div>
      </div>
    </Modal>
  )
}
