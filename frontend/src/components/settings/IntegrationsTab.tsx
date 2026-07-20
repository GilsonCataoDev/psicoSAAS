import { CalendarDays, CheckCircle2, ExternalLink } from 'lucide-react'
import { type Prefs } from './types'
import { Toggle } from './Toggle'

interface Props {
  prefs: Prefs
  calendarBusy: boolean
  googleCalendarAvailable: boolean
  googleLastSyncedAt: string | null
  googleLastSyncError: string | null
  setConfirmDisconnectGoogle: (v: boolean) => void
  connectGoogleCalendar: () => void
  togglePref: (key: keyof Prefs) => void
}

export function IntegrationsTab({
  prefs, calendarBusy, googleCalendarAvailable,
  googleLastSyncedAt, googleLastSyncError,
  setConfirmDisconnectGoogle, connectGoogleCalendar,
  togglePref,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-sage-50 text-sage-600 flex items-center justify-center">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="section-title mb-0.5">Google Agenda</h2>
              <p className="text-sm text-neutral-500">
                Sessões criadas ou confirmadas na UseCognia são sincronizadas automaticamente com sua agenda Google.
              </p>
            </div>
          </div>
          <span className={`badge ${prefs.googleCalendarConnected ? 'bg-sage-50 text-sage-700' : 'bg-neutral-100 text-neutral-500'}`}>
            {prefs.googleCalendarConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>

        {prefs.googleCalendarConnected ? (
          <div className="rounded-xl border border-sage-100 bg-sage-50 p-4 text-sm text-sage-700 space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-sage-600 shrink-0" />
              <p className="font-medium">{prefs.googleCalendarEmail || 'Google Agenda autorizado'}</p>
            </div>
            {googleLastSyncError ? (
              <p className="text-xs text-rose-600 pl-6">
                Última sincronização falhou: {googleLastSyncError}
              </p>
            ) : googleLastSyncedAt ? (
              <p className="text-xs text-sage-500 pl-6">
                Última sincronização: {new Date(googleLastSyncedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            ) : (
              <p className="text-xs text-sage-500 pl-6">Nenhuma sessão sincronizada ainda</p>
            )}
          </div>
        ) : !googleCalendarAvailable ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-medium">Integração em configuração</p>
            <p className="mt-1">
              O Google Agenda ainda precisa das credenciais OAuth da plataforma antes de ser usado.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
            <p className="font-medium text-neutral-700">Permissão necessária</p>
            <p className="mt-1">
              O Google solicitará acesso para criar eventos na sua agenda. A UseCognia não lê seus eventos pessoais.
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Sincroniza', 'Sessões criadas, remarcadas ou confirmadas.'],
            ['Não importa', 'Eventos pessoais já existentes no Google.'],
            ['Remove', 'Eventos da UseCognia quando uma sessão é cancelada.'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{title}</p>
              <p className="mt-1 text-sm text-neutral-600">{text}</p>
            </div>
          ))}
        </div>

        <div className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <div>
            <p className="text-sm font-medium text-neutral-800">Convidar paciente pelo Google Agenda</p>
            <p className="mt-1 text-xs text-neutral-500">
              Envia ao e-mail cadastrado o convite, as remarcações e o cancelamento. O evento usa um título discreto para preservar a privacidade.
            </p>
          </div>
          <Toggle
            on={prefs.googleCalendarInvitePatients}
            onChange={() => togglePref('googleCalendarInvitePatients')}
            disabled={!prefs.googleCalendarConnected || calendarBusy}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {prefs.googleCalendarConnected ? (
            <button
              type="button"
              onClick={() => setConfirmDisconnectGoogle(true)}
              disabled={calendarBusy}
              className="btn-secondary text-sm"
            >
              {calendarBusy ? 'Desconectando...' : 'Desconectar'}
            </button>
          ) : (
            <button
              type="button"
              onClick={connectGoogleCalendar}
              disabled={calendarBusy || !googleCalendarAvailable}
              className="btn-primary text-sm inline-flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {!googleCalendarAvailable ? 'Aguardando configuração' : calendarBusy ? 'Abrindo Google...' : 'Conectar Google Agenda'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
