import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { Link2, Copy, MessageCircle, Check, ExternalLink, AlertCircle } from 'lucide-react'
import { FinancialRecord } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { useGeneratePaymentLink } from '@/hooks/useApi'
import toast from 'react-hot-toast'

interface Props {
  record: FinancialRecord | null
  open: boolean
  onClose: () => void
}

export default function PaymentLinkModal({ record, open, onClose }: Props) {
  const generate = useGeneratePaymentLink()
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    if (!record) return
    try {
      const result = await generate.mutateAsync(record.id)
      setUrl(result.url)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erro ao gerar link'
      toast.error(msg)
    }
  }

  function handleClose() {
    setUrl(null)
    setCopied(false)
    generate.reset()
    onClose()
  }

  async function copyLink() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Link copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  function sendWhatsApp() {
    if (!url || !record) return
    const name   = record.patient?.name ?? 'você'
    const amount = formatCurrency(record.amount)
    const text   = encodeURIComponent(
      `Olá, ${name}! 🌿\n\nSegue o link para pagamento da sessão (${amount}):\n\n${url}\n\nVocê pode pagar via cartão de crédito, PIX ou boleto. Qualquer dúvida, me avise! 💙`
    )
    const phone = (record.patient as any)?.phone?.replace(/\D/g, '')
    const dest  = phone ? `55${phone}` : ''
    window.open(`https://wa.me/${dest}?text=${text}`, '_blank')
  }

  if (!record) return null

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Link de pagamento"
      description={`Cobrança de ${formatCurrency(record.amount)} para ${record.patient?.name ?? record.description}`}
      size="sm"
    >
      <div className="space-y-5">
        {!url ? (
          <>
            {/* Explicação */}
            <div className="bg-sage-50 border border-sage-100 rounded-xl px-4 py-3.5 space-y-2">
              <div className="flex items-start gap-2">
                <Link2 className="w-4 h-4 text-sage-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-sage-800">Como funciona</p>
                  <p className="text-xs text-sage-600 mt-0.5 leading-relaxed">
                    Gera um link seguro pelo Asaas. O paciente escolhe como pagar:
                    <strong> cartão de crédito, PIX ou boleto</strong>. O valor cai direto na sua conta Asaas.
                  </p>
                </div>
              </div>
            </div>

            {/* Aviso chave */}
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p>
                Você precisa ter a <strong>chave API Asaas</strong> configurada em{' '}
                <strong>Configurações → Pagamentos</strong>. Se ainda não tem conta,{' '}
                <a href="https://www.asaas.com" target="_blank" rel="noreferrer"
                  className="underline hover:no-underline">crie grátis em asaas.com</a>.
              </p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generate.isPending}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {generate.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Gerar link de pagamento
                </>
              )}
            </button>
          </>
        ) : (
          <>
            {/* Link gerado */}
            <div className="bg-sage-50 border border-sage-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-sage-700 uppercase tracking-wide mb-2">
                Link gerado com sucesso ✓
              </p>
              <p className="text-xs font-mono text-sage-800 break-all leading-relaxed">{url}</p>
            </div>

            {/* Ações */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={copyLink}
                className="btn-secondary flex items-center justify-center gap-2 text-sm"
              >
                {copied
                  ? <><Check className="w-4 h-4 text-sage-500" /> Copiado!</>
                  : <><Copy className="w-4 h-4" /> Copiar link</>
                }
              </button>
              <button
                onClick={sendWhatsApp}
                className="btn-primary flex items-center justify-center gap-2 text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar WhatsApp
              </button>
            </div>

            <button
              onClick={() => window.open(url, '_blank')}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-neutral-400 hover:text-sage-600 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Abrir link de pagamento
            </button>

            {/* Nota sobre webhook */}
            <p className="text-xs text-neutral-400 text-center leading-relaxed">
              Quando o paciente pagar, o status é atualizado automaticamente
              se você tiver o webhook Asaas configurado.
            </p>
          </>
        )}
      </div>
    </Modal>
  )
}
