import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Zap } from 'lucide-react'

type CommissionStatus =
  | 'pending'
  | 'validating'
  | 'payable'
  | 'paid'
  | 'refunded'
  | 'chargeback'

interface Commission {
  id: string
  status: CommissionStatus
  couponCode: string
  commissionAmount: number
  grossAmount: number | null
  paymentApprovedAt: string | null
  commissionAvailableAt: string | null
  commissionPaidAt: string | null
  createdAt: string
  clientReference: string
}

interface PortalData {
  id: string
  name: string
  couponCode: string
  status: string
  totalSales: number
  pendingCount: number
  payableCount: number
  paidCount: number
  pendingAmount: number
  payableAmount: number
  paidAmount: number
  nextPaymentAt: string | null
  commissions: Commission[]
}

const STATUS_LABELS: Record<CommissionStatus, string> = {
  pending: 'Aguardando pagamento',
  validating: 'Em validação',
  payable: 'A receber',
  paid: 'Pago',
  refunded: 'Estornado',
  chargeback: 'Chargeback',
}

const STATUS_COLORS: Record<CommissionStatus, string> = {
  pending: 'bg-neutral-100 text-neutral-600',
  validating: 'bg-amber-100 text-amber-700',
  payable: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  refunded: 'bg-rose-100 text-rose-700',
  chargeback: 'bg-rose-100 text-rose-700',
}

function brl(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function VendedorPortalPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<PortalData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { setError('Link inválido'); setLoading(false); return }
    const base = import.meta.env.VITE_API_URL ?? '/api'
    fetch(`${base}/sales/portal/${token}`)
      .then(async (res) => {
        if (res.status === 404) throw new Error('notfound')
        if (!res.ok) throw new Error('error')
        return res.json()
      })
      .then(setData)
      .catch((e) => setError(e.message === 'notfound' ? 'Link inválido ou expirado.' : 'Erro ao carregar dados.'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage-600 border-t-transparent" />
      </div>

    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 px-4 text-center">
        <Zap className="h-10 w-10 text-sage-600" />
        <h1 className="text-xl font-semibold text-neutral-800">Link inválido</h1>
        <p className="max-w-sm text-sm text-neutral-500">{error ?? 'Este link de vendedor não existe ou expirou.'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Zap className="h-7 w-7 text-sage-600" />
          <span className="text-sm font-semibold text-neutral-700">UseCognia · Portal do Vendedor</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        {/* Nome + cupom */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Olá,</p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-800">{data.name}</h1>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-neutral-500">Seu cupom:</span>
            <span className="rounded-lg bg-sage-50 px-3 py-1 font-mono text-base font-bold text-sage-700 tracking-widest border border-sage-200">
              {data.couponCode}
            </span>
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            Compartilhe este código para que as novas assinaturas sejam identificadas como suas vendas.
          </p>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-center">
            <p className="text-xs text-neutral-500">A receber</p>
            <p className="mt-1 text-lg font-bold text-blue-700">{brl(data.payableAmount)}</p>
            <p className="text-xs text-neutral-400">{data.payableCount} comissão{data.payableCount !== 1 ? 'ões' : ''}</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-center">
            <p className="text-xs text-neutral-500">Já recebido</p>
            <p className="mt-1 text-lg font-bold text-emerald-700">{brl(data.paidAmount)}</p>
            <p className="text-xs text-neutral-400">{data.paidCount} pago{data.paidCount !== 1 ? 's' : ''}</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-center">
            <p className="text-xs text-neutral-500">Aguardando</p>
            <p className="mt-1 text-lg font-bold text-neutral-700">{brl(data.pendingAmount)}</p>
            <p className="text-xs text-neutral-400">{data.pendingCount} pendente{data.pendingCount !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Próximo pagamento */}
        {data.nextPaymentAt && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Próximo pagamento disponível em: <strong>{formatDate(data.nextPaymentAt)}</strong>
          </div>
        )}

        {/* Lista de comissões */}
        <div className="rounded-2xl border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-neutral-800">Comissões ({data.totalSales})</h2>
          </div>
          {data.commissions.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-neutral-400">
              Nenhuma comissão registrada ainda. Compartilhe seu cupom para começar.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {data.commissions.map((c) => (
                <li key={c.id} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-neutral-700">
                      {c.clientReference}
                    </p>
                    <p className="text-xs text-neutral-400">
                      Cadastro em {formatDate(c.createdAt)}
                      {c.commissionAvailableAt && c.status === 'validating' && (
                        <> · Libera em {formatDate(c.commissionAvailableAt)}</>
                      )}
                      {c.commissionPaidAt && (
                        <> · Pago em {formatDate(c.commissionPaidAt)}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                    <span className="text-sm font-semibold text-neutral-800">
                      {brl(c.commissionAmount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-center text-xs text-neutral-400 pb-6">
          Pagamentos via Pix. Dúvidas? Entre em contato com a equipe UseCognia.
        </p>
      </main>
    </div>
  )
}
