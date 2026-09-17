import { useState } from 'react'
import { CheckCircle2, Copy, Gift, WalletCards } from 'lucide-react'
import { ReferralStatus, useReferral } from './useReferral'

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const STATUS: Record<ReferralStatus, { label: string; style: string }> = {
  captured: { label: 'aguardando assinatura', style: 'bg-neutral-100 text-neutral-600' },
  validating: { label: 'em validação', style: 'bg-amber-100 text-amber-700' },
  payable: { label: 'liberada', style: 'bg-blue-100 text-blue-700' },
  paid: { label: 'paga', style: 'bg-emerald-100 text-emerald-700' },
  refunded: { label: 'estornada', style: 'bg-red-100 text-red-700' },
  chargeback: { label: 'contestada', style: 'bg-red-100 text-red-700' },
  ineligible: { label: 'programa anterior', style: 'bg-neutral-100 text-neutral-500' },
}

export default function ReferralCard() {
  const { stats, referralUrl, copied, copyLink, shareWhatsApp, savePayout } = useReferral()
  const [editingPayout, setEditingPayout] = useState(false)
  const [pixKeyType, setPixKeyType] = useState('cpf')
  const [pixKey, setPixKey] = useState('')
  const [taxpayerId, setTaxpayerId] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  if (!stats) return null

  function submitPayout(event: React.FormEvent) {
    event.preventDefault()
    if (!acceptedTerms) return
    savePayout.mutate({ pixKeyType, pixKey, taxpayerId: taxpayerId.replace(/\D/g, ''), acceptedTerms: true }, {
      onSuccess: () => { setEditingPayout(false); setPixKey(''); setTaxpayerId(''); setAcceptedTerms(false) },
    })
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-100">
          <Gift className="h-4.5 w-4.5 text-sage-600" />
        </div>
        <div>
          <h2 className="section-title mb-0">Indique e ganhe</h2>
          <p className="text-xs text-neutral-500">{money.format(stats.commissionAmount)} por nova assinatura aprovada</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Em validação" value={stats.pendingAmount} />
        <Metric label="A receber" value={stats.payableAmount} highlight />
        <Metric label="Já recebido" value={stats.paidAmount} />
      </div>

      <div className="rounded-2xl border border-sage-100 bg-sage-50 p-3 text-xs leading-5 text-sage-800">
        A comissão é única e corresponde a 50% do primeiro pagamento de R$ 97,90. Ela é liberada após {stats.validationDays} dias, se não houver estorno ou contestação. O indicado não recebe desconto.
      </div>

      <div>
        <p className="mb-2 text-xs text-neutral-500">Seu link individual</p>
        <div className="flex items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5">
          <p className="flex-1 truncate font-mono text-xs text-neutral-600">{referralUrl}</p>
          <button onClick={copyLink} className="shrink-0 rounded-lg p-1 hover:bg-white" aria-label="Copiar link de indicação">
            {copied ? <CheckCircle2 className="h-4 w-4 text-sage-500" /> : <Copy className="h-4 w-4 text-neutral-400" />}
          </button>
        </div>
      </div>

      <button onClick={shareWhatsApp} className="btn-primary flex w-full items-center justify-center gap-2 py-2.5 text-sm">
        Compartilhar convite
      </button>

      <div className="rounded-xl border border-neutral-100 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <WalletCards className="h-4 w-4 text-sage-600" />
            <div>
              <p className="text-xs font-semibold text-neutral-700">Pagamento por Pix</p>
              <p className="text-[11px] text-neutral-500">
                {stats.payoutProfile.configured ? `${stats.payoutProfile.pixKeyType}: ${stats.payoutProfile.pixKeyMasked}` : 'Cadastre antes do primeiro pagamento.'}
              </p>
            </div>
          </div>
          <button type="button" className="text-xs font-semibold text-sage-700" onClick={() => setEditingPayout(value => !value)}>
            {stats.payoutProfile.configured ? 'Alterar' : 'Cadastrar'}
          </button>
        </div>

        {editingPayout && (
          <form onSubmit={submitPayout} className="mt-3 space-y-2 border-t border-neutral-100 pt-3">
            <select className="input-field" value={pixKeyType} onChange={event => setPixKeyType(event.target.value)}>
              <option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option>
              <option value="phone">Telefone</option><option value="random">Chave aleatória</option>
            </select>
            <input className="input-field" value={pixKey} onChange={event => setPixKey(event.target.value)} placeholder="Chave Pix" required />
            <input className="input-field" value={taxpayerId} onChange={event => setTaxpayerId(event.target.value)} placeholder="CPF ou CNPJ do recebedor" required />
            <label className="flex items-start gap-2 text-[11px] leading-4 text-neutral-600">
              <input type="checkbox" className="mt-0.5" checked={acceptedTerms} onChange={event => setAcceptedTerms(event.target.checked)} />
              <span>Aceito o regulamento v{stats.termsVersion}: {stats.termsText}</span>
            </label>
            <button className="btn-primary w-full py-2 text-xs" disabled={!acceptedTerms || savePayout.isPending}>
              {savePayout.isPending ? 'Salvando…' : 'Salvar dados de pagamento'}
            </button>
          </form>
        )}
      </div>

      {stats.invited.length > 0 && (
        <div className="space-y-2 border-t border-neutral-100 pt-3">
          <p className="text-xs font-semibold text-neutral-500">Últimas indicações</p>
          {stats.invited.slice(0, 5).map(item => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-neutral-700">{item.name}</p>
                <p className="text-[11px] text-neutral-400">{item.commissionAmount ? money.format(item.commissionAmount) : 'Aguardando primeiro pagamento'}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS[item.status].style}`}>
                {STATUS[item.status].label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-2 text-center ${highlight ? 'bg-sage-50' : 'bg-neutral-50'}`}>
      <p className={`text-sm font-bold ${highlight ? 'text-sage-700' : 'text-neutral-800'}`}>{money.format(value)}</p>
      <p className="mt-0.5 text-[10px] text-neutral-500">{label}</p>
    </div>
  )
}
