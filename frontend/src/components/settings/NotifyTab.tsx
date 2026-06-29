import { isPushSupported } from '@/lib/pushNotifications'
import { Toggle } from './Toggle'
import { type Prefs } from './types'

interface Props {
  prefs: Prefs
  togglePref: (key: keyof Prefs) => void
  hasProAutomation: boolean
  loadingPrefs: boolean
  pushConfigured: boolean
  pushSubscribed: boolean
  pushBusy: boolean
  nativeApp: boolean
  activateWebPush: () => void
  deactivateWebPush: () => void
  testWebPush: () => void
}

export function NotifyTab({
  prefs, togglePref, hasProAutomation, loadingPrefs,
  pushConfigured, pushSubscribed, pushBusy, nativeApp,
  activateWebPush, deactivateWebPush, testWebPush,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="card space-y-5">
        <h2 className="section-title">Lembretes automáticos</h2>
        {!hasProAutomation && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">Automacoes de WhatsApp ficam no plano Pro.</p>
            <p className="mt-1">No Essencial, os botoes manuais de WhatsApp continuam liberados na agenda e nos agendamentos.</p>
          </div>
        )}
        {loadingPrefs ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {([
              { key: 'reminder24h',        label: 'Lembrete 24h antes da sessão',   desc: 'Mensagem enviada via WhatsApp no dia anterior' },
              { key: 'reminder2h',         label: 'Lembrete 2h antes da sessão',    desc: 'Mensagem rápida no dia do atendimento' },
              { key: 'dailyAgendaDigest',  label: 'Resumo diário da agenda',        desc: 'Envia para você, pela manhã, a lista de pacientes do dia' },
              { key: 'bookingConfirmation',label: 'Confirmação de agendamento',      desc: 'Notifica quando um horário é reservado' },
            ] as const).map(item => (
              <div key={item.key} className="flex items-center justify-between gap-4 py-2 border-b border-neutral-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-700">{item.label}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{item.desc}</p>
                </div>
                <Toggle disabled={!hasProAutomation} on={!!prefs[item.key]} onChange={() => togglePref(item.key)} />
              </div>
            ))}
            <p className="text-xs text-neutral-400 pt-1">
              Os lembretes podem sair por WhatsApp e por notificacao push do navegador. Configure o WhatsApp na aba <strong>Mensagens</strong>.
            </p>
            <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Exemplo de lembrete</p>
              <p className="text-sm text-neutral-700">
                Ola, Marina! Passando para lembrar da nossa sessao em terça-feira, 14 de julho as 15:00.
              </p>
              <p className="mt-2 text-xs text-neutral-400">
                O texto pode ser ajustado na aba Mensagens.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="card space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="section-title mb-1">Notificações push</h2>
            <p className="text-sm text-neutral-500">
              {nativeApp
                ? 'No app Android, os lembretes continuam por WhatsApp. Push nativo entra na etapa de loja.'
                : 'Receba avisos no navegador quando houver lembrete de sessão.'}
            </p>
          </div>
          <span className={`badge ${pushSubscribed ? 'bg-sage-50 text-sage-700' : 'bg-neutral-100 text-neutral-500'}`}>
            {pushSubscribed ? 'Ativas' : 'Inativas'}
          </span>
        </div>

        {nativeApp && (
          <div className="rounded-xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm text-sage-800">
            Para Android de loja, a proxima etapa e trocar Web Push por push nativo. Esta tela ainda controla notificacoes do navegador/PWA.
          </div>
        )}

        {!nativeApp && !isPushSupported() && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Este navegador nao suporta notificacoes push. Tente pelo Chrome, Edge ou instale como PWA.
          </div>
        )}

        {!nativeApp && isPushSupported() && !pushConfigured && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Notificacoes push ainda nao estao configuradas no servidor.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!pushSubscribed ? (
            <button
              type="button"
              onClick={activateWebPush}
              disabled={pushBusy || nativeApp || !isPushSupported() || !pushConfigured}
              className="btn-primary text-sm"
            >
              {pushBusy ? 'Ativando...' : nativeApp ? 'Push nativo em breve' : 'Ativar neste navegador'}
            </button>
          ) : (
            <button
              type="button"
              onClick={deactivateWebPush}
              disabled={pushBusy || nativeApp}
              className="btn-secondary text-sm"
            >
              {pushBusy ? 'Desativando...' : 'Desativar neste navegador'}
            </button>
          )}
          <button
            type="button"
            onClick={testWebPush}
            disabled={pushBusy || nativeApp || !pushSubscribed}
            className="btn-secondary text-sm"
          >
            Enviar teste
          </button>
        </div>

        <p className="text-xs text-neutral-400">
          O aviso mostra apenas informacoes operacionais da sessao, sem conteudo clinico.
        </p>
      </div>
    </div>
  )
}
