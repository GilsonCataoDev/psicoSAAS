import { useState } from 'react'
import { MessageCircle, Copy, Check } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { FinancialRecord } from '@/types'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

const PIX_KEY = '11999990000' // viria das configurações do psicólogo

function buildWhatsAppMsg(record: FinancialRecord, pixKey: string): string {
  const lines = [
    `Olá, ${record.patient?.name?.split(' ')[0] ?? ''}! 🌿`,
    ``,
    `Segue o valor da nossa sessão:`,
    `💚 *${formatCurrency(record.amount)}*`,
    ``,
    `Pode pagar via PIX:`,
    `🔑 Chave: \`${pixKey}\``,
    ``,
    `Qualquer dúvida, é só me chamar. Obrigada! 🙏`,
  ]
  return lines.join('\n')
}

export default function SendChargeModal({
  record,
  open,
  onClose,
}: {
  record: FinancialRecord | null
  open: boolean
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  if (!record) return null

  const msg = buildWhatsAppMsg(record, PIX_KEY)
  const phone = record.patient?.phone?.replace(/\D/g, '') ?? ''
  const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`

  function copyMsg() {
    navigator.clipboard.writeText(msg)
    setCopied(true)
    toast.success('Mensagem copiada!')
    setTimeout(() => setCopied(false), 2000)
  }

  function copyPix() {
    navigator.clipboard.writeText(PIX_KEY)
    toast.success('Chave PIX copiada!')
  }

  return (
    <Modal open={open} onClose={onClose} title="Enviar cobrança"
      description={`Cobrança para ${record.patient?.name ?? 'paciente'}`}>
      <div className="space-y-5">

        {/* Resumo da cobrança */}
        <div className="flex items-center justify-between bg-neutral-50 rounded-2xl p-4">
          <div>
            <p className="text-sm text-neutral-500">{record.description}</p>
            <p className="text-2xl font-bold text-neutral-800 mt-0.5">{formatCurrency(record.amount)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-400">Chave PIX</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-mono text-sm text-neutral-700">{PIX_KEY}</p>
              <button onClick={copyPix}
                className="text-sage-600 hover:text-sage-700">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Prévia da mensagem */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Mensagem de cobrança</label>
            <button onClick={copyMsg}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copiada!' : 'Copiar'}
            </button>
          </div>
          <div className="bg-[#dcf8c6] rounded-2xl rounded-tl-sm p-4 text-sm text-neutral-800 whitespace-pre-line font-['Inter'] shadow-sm">
            {msg}
          </div>
          <p className="text-xs text-neutral-400 mt-1.5">
            Pré-visualização no estilo WhatsApp. Edite o texto antes de enviar se quiser.
          </p>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          {phone ? (
            <a href={whatsappUrl} target="_blank" rel="noreferrer"
              className="btn-primary flex items-center justify-center gap-2 flex-1">
              <MessageCircle className="w-4 h-4" />
              Abrir no WhatsApp
            </a>
          ) : (
            <div className="flex-1 bg-neutral-100 text-neutral-500 text-sm text-center py-3 rounded-xl">
              Telefone não cadastrado para esta pessoa
            </div>
          )}
          <button onClick={copyMsg}
            className="btn-secondary flex items-center justify-center gap-2 flex-1">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copiar mensagem
          </button>
        </div>
      </div>
    </Modal>
  )
}
