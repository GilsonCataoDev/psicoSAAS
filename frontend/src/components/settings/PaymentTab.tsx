import { type UseMutationResult } from '@tanstack/react-query'
import { type Template } from '@/hooks/api/templates'
import { Toggle } from './Toggle'
import { type Prefs } from './types'

interface Props {
  prefs: Prefs
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void
  togglePref: (key: keyof Prefs) => void
  savingPrefs: boolean
  hasProAutomation: boolean
  receiptTemplates: Template[]
  createTemplate: UseMutationResult<any, any, any, any>
  savePrefs: (section?: string) => void
  saveTemplate: (type: 'whatsapp_message' | 'receipt', name: string, content: string) => void
}

function previewCharge(template: string, pixKey: string) {
  return template
    .split('{{nome}}').join('Marina')
    .split('{{valor}}').join('R$ 180,00')
    .split('{{pix}}').join(pixKey || '11999990000')
    .split('{{comprovante}}').join('Pode enviar o comprovante por aqui.')
}

export function PaymentTab({
  prefs, setPref, togglePref, savingPrefs, hasProAutomation,
  receiptTemplates, createTemplate, savePrefs, saveTemplate,
}: Props) {
  return (
    <div className="space-y-5">
      {!hasProAutomation && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">Links, cartão e cobranças automáticas são recursos Pro.</p>
          <p className="mt-1">No Essencial, o controle financeiro manual continua liberado.</p>
        </div>
      )}
      <div className="card space-y-4">
        <h2 className="section-title">Chave PIX</h2>
        <div>
          <label className="label">Tipo de chave</label>
          <select className="input-field" value={prefs.pixKeyType}
            onChange={e => setPref('pixKeyType', e.target.value)}>
            <option value="cpf">CPF</option>
            <option value="phone">Telefone</option>
            <option value="email">E-mail</option>
            <option value="random">Chave aleatória</option>
          </select>
        </div>
        <div>
          <label className="label">Chave PIX</label>
          <input value={prefs.pixKey} onChange={e => setPref('pixKey', e.target.value)}
            disabled={!hasProAutomation}
            className="input-field" placeholder="Sua chave PIX" />
        </div>
        <div>
          <label className="label">Nome favorecido</label>
          <input value={prefs.pixName} onChange={e => setPref('pixName', e.target.value)}
            disabled={!hasProAutomation}
            className="input-field" placeholder="Como aparece na transferência PIX" />
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="section-title">Cobranças automáticas</h2>
        {([
          { key: 'autoCharge',     label: 'Enviar cobrança após sessão',           desc: 'Mensagem automática com o valor e chave PIX' },
          { key: 'lateReminder',   label: 'Lembrete de pagamento em atraso',        desc: 'Avisa após 3 dias sem pagamento' },
          { key: 'includeReceipt', label: 'Incluir comprovante no registro',        desc: 'Solicita comprovante ao confirmar pagamento' },
        ] as const).map(item => (
          <div key={item.key} className="flex items-center justify-between gap-4 py-2 border-b border-neutral-50 last:border-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-700">{item.label}</p>
              <p className="text-xs text-neutral-400 mt-0.5">{item.desc}</p>
            </div>
            <Toggle disabled={!hasProAutomation} on={!!prefs[item.key]} onChange={() => togglePref(item.key)} />
          </div>
        ))}
      </div>

      <div className="card space-y-4">
        <h2 className="section-title">Modelo de mensagem de cobrança</h2>
        {receiptTemplates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {receiptTemplates.map(template => (
              <button
                key={template.id}
                type="button"
                className="rounded-full border border-sage-100 bg-sage-50 px-3 py-1 text-xs font-medium text-sage-700 hover:bg-sage-100"
                onClick={() => setPref('chargeTemplate', template.content)}
              >
                Usar {template.name}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-neutral-400">
          Variáveis:{' '}
          <code className="bg-neutral-100 px-1 rounded">{'{{nome}}'}</code>{' '}
          <code className="bg-neutral-100 px-1 rounded">{'{{valor}}'}</code>{' '}
          <code className="bg-neutral-100 px-1 rounded">{'{{pix}}'}</code>
        </p>
        <textarea rows={4} className="input-field resize-none text-sm"
          disabled={!hasProAutomation}
          value={prefs.chargeTemplate}
          onChange={e => setPref('chargeTemplate', e.target.value)} />
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Prévia para paciente</p>
          <p className="whitespace-pre-line text-sm text-neutral-700">{previewCharge(prefs.chargeTemplate, prefs.pixKey)}</p>
        </div>
        <button type="button" className="btn-secondary text-xs w-fit"
          disabled={!hasProAutomation || createTemplate.isPending}
          onClick={() => saveTemplate('receipt', 'Cobranca personalizada', prefs.chargeTemplate)}>
          Salvar como template
        </button>
        <div className="flex justify-end">
          <button onClick={() => savePrefs('Pagamentos')} disabled={savingPrefs || !hasProAutomation} className="btn-primary text-sm flex items-center gap-2">
            {savingPrefs && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  )
}
