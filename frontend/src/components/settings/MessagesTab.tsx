import { type UseMutationResult } from '@tanstack/react-query'
import { type Template } from '@/hooks/api/templates'
import { type Prefs } from './types'
import { type WhatsAppLog, type WhatsAppStatus } from './types'

interface Props {
  prefs: Prefs
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void
  savingPrefs: boolean
  hasProAutomation: boolean
  whatsappConnected: boolean
  whatsappConfigured: boolean
  whatsappStatus: WhatsAppStatus | null
  whatsappQr: string
  whatsappBusy: boolean
  whatsappLogs: WhatsAppLog[]
  messageTemplates: Template[]
  createTemplate: UseMutationResult<any, any, any, any>
  connectWhatsApp: () => void
  testWhatsApp: () => void
  resetWhatsApp: () => void
  savePrefs: (section?: string) => void
  saveTemplate: (type: 'whatsapp_message' | 'receipt', name: string, content: string) => void
}

function previewMessage(template: string) {
  return template
    .split('{{nome}}').join('Marina')
    .split('{{data}}').join('terça-feira, 14 de julho')
    .split('{{hora}}').join('15:00')
}

export function MessagesTab({
  prefs, setPref, savingPrefs, hasProAutomation,
  whatsappConnected, whatsappConfigured, whatsappStatus, whatsappQr, whatsappBusy, whatsappLogs,
  messageTemplates, createTemplate,
  connectWhatsApp, testWhatsApp, resetWhatsApp, savePrefs, saveTemplate,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title mb-0">WhatsApp</h2>
          <span className={`badge ${whatsappConnected ? 'bg-sage-50 text-sage-700' : 'bg-amber-50 text-amber-700'}`}>
            {whatsappConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
        {whatsappConnected && (
          <div className="rounded-xl border border-sage-100 bg-sage-50 px-4 py-3 text-sm text-sage-800">
            <p className="font-medium">WhatsApp conectado</p>
            <p className="mt-1 text-sage-700">
              {whatsappStatus?.profileName ? `${whatsappStatus.profileName} · ` : ''}
              {whatsappStatus?.phone ? `+${whatsappStatus.phone}` : 'Numero conectado pela instancia da psicologa'}
            </p>
          </div>
        )}
        {!hasProAutomation && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">Envio automatico sera recurso Pro.</p>
            <p className="mt-1">Voce ainda pode usar o WhatsApp manual com mensagem pronta nos planos pagos.</p>
          </div>
        )}
        <div>
          <label className="label">Seu número de WhatsApp</label>
          <input value={prefs.whatsapp} onChange={e => setPref('whatsapp', e.target.value)}
            disabled={!hasProAutomation}
            className="input-field" placeholder="5511999990000 (com DDI e DDD, sem espaços)" />
          <p className="text-xs text-neutral-400 mt-1">
            As mensagens saem do aparelho conectado pelo QR Code deste psicólogo.
          </p>
        </div>
        {hasProAutomation && !whatsappConnected && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-medium">
              {whatsappConfigured ? 'Conecte o WhatsApp para ativar as automacoes' : 'Servidor de WhatsApp nao configurado'}
            </p>
            {whatsappQr && (
              <div className="mt-3 space-y-2">
                <div className="rounded-xl bg-white p-3 w-fit">
                  <img src={whatsappQr} alt="QR Code para conectar WhatsApp" className="h-64 w-64" />
                </div>
                <p className="text-xs">
                  No celular: WhatsApp &gt; Aparelhos conectados &gt; Conectar aparelho. O QR atualiza automaticamente.
                </p>
              </div>
            )}
          </div>
        )}
        {hasProAutomation && whatsappConfigured && (
          <div className="flex flex-wrap gap-2">
            {!whatsappConnected && (
              <button type="button" onClick={connectWhatsApp} disabled={whatsappBusy} className="btn-primary text-sm">
                {whatsappBusy ? 'Gerando QR Code...' : whatsappQr ? 'Gerar novo QR Code' : 'Conectar WhatsApp'}
              </button>
            )}
            {(whatsappConnected || whatsappQr) && (
              <button type="button" onClick={resetWhatsApp} disabled={whatsappBusy} className="btn-secondary text-sm">
                Reiniciar conexao
              </button>
            )}
            <button type="button" onClick={testWhatsApp} disabled={whatsappBusy || !prefs.whatsapp} className="btn-secondary text-sm">
              Enviar mensagem teste
            </button>
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title mb-0">Historico de envios</h2>
          <span className="text-xs text-neutral-400">ultimos 20</span>
        </div>
        {whatsappLogs.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum envio registrado ainda.</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {whatsappLogs.map(log => (
              <div key={log.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-800">
                    {log.type} {log.patientName ? `· ${log.patientName}` : ''}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {new Date(log.createdAt).toLocaleString('pt-BR')} {log.recipientPhone ? `· +${log.recipientPhone}` : ''}
                  </p>
                  {log.status === 'sent' && log.providerStatus === 'unverified' && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      Enviado, mas não foi possível confirmar se o conteúdo chegou ao paciente. Se ele não recebeu, reenvie.
                    </p>
                  )}
                  {log.status === 'sent' && log.providerStatus !== 'unverified' && typeof log.contentLength === 'number' && (
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      Conteúdo confirmado · {log.contentLength} caracteres
                    </p>
                  )}
                  {log.status === 'failed' && log.error && (
                    <p className="mt-1 text-xs text-red-600">{log.error}</p>
                  )}
                </div>
                <span className={`badge w-fit ${log.status === 'sent' ? 'bg-sage-50 text-sage-700' : 'bg-red-50 text-red-700'}`}>
                  {log.status === 'sent' ? 'Enviado' : 'Falhou'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <h2 className="section-title">Modelo de confirmação</h2>
        {messageTemplates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {messageTemplates.map(template => (
              <button
                key={template.id}
                type="button"
                className="rounded-full border border-sage-100 bg-sage-50 px-3 py-1 text-xs font-medium text-sage-700 hover:bg-sage-100"
                onClick={() => setPref('confirmationTemplate', template.content)}
              >
                Usar {template.name}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-neutral-400">
          Variáveis: <code className="bg-neutral-100 px-1 rounded">{'{{nome}}'}</code>{' '}
          <code className="bg-neutral-100 px-1 rounded">{'{{data}}'}</code>{' '}
          <code className="bg-neutral-100 px-1 rounded">{'{{hora}}'}</code>
        </p>
        <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Evite informacoes clinicas, diagnosticos ou detalhes sensiveis. Use apenas dados operacionais.
        </p>
        <textarea rows={3} className="input-field resize-none text-sm"
          disabled={!hasProAutomation}
          value={prefs.confirmationTemplate}
          onChange={e => setPref('confirmationTemplate', e.target.value)} />
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Prévia para paciente</p>
          <p className="whitespace-pre-line text-sm text-neutral-700">{previewMessage(prefs.confirmationTemplate)}</p>
        </div>
        <button type="button" className="btn-secondary text-xs w-fit"
          disabled={!hasProAutomation || createTemplate.isPending}
          onClick={() => saveTemplate('whatsapp_message', 'Confirmacao personalizada', prefs.confirmationTemplate)}>
          Salvar como template
        </button>
      </div>

      <div className="card space-y-4">
        <h2 className="section-title">Modelo de lembrete — 24h antes</h2>
        {messageTemplates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {messageTemplates.map(template => (
              <button
                key={template.id}
                type="button"
                className="rounded-full border border-sage-100 bg-sage-50 px-3 py-1 text-xs font-medium text-sage-700 hover:bg-sage-100"
                onClick={() => setPref('reminderTemplate24h', template.content)}
              >
                Usar {template.name}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-neutral-400">
          Variáveis: <code className="bg-neutral-100 px-1 rounded">{'{{nome}}'}</code>{' '}
          <code className="bg-neutral-100 px-1 rounded">{'{{data}}'}</code>{' '}
          <code className="bg-neutral-100 px-1 rounded">{'{{hora}}'}</code>
        </p>
        <textarea rows={3} className="input-field resize-none text-sm"
          disabled={!hasProAutomation}
          value={prefs.reminderTemplate24h}
          onChange={e => setPref('reminderTemplate24h', e.target.value)} />
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Prévia para paciente</p>
          <p className="whitespace-pre-line text-sm text-neutral-700">{previewMessage(prefs.reminderTemplate24h)}</p>
        </div>
        <button type="button" className="btn-secondary text-xs w-fit"
          disabled={!hasProAutomation || createTemplate.isPending}
          onClick={() => saveTemplate('whatsapp_message', 'Lembrete 24h personalizado', prefs.reminderTemplate24h)}>
          Salvar como template
        </button>
      </div>

      <div className="card space-y-4">
        <h2 className="section-title">Modelo de lembrete — 1h antes</h2>
        {messageTemplates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {messageTemplates.map(template => (
              <button
                key={template.id}
                type="button"
                className="rounded-full border border-sage-100 bg-sage-50 px-3 py-1 text-xs font-medium text-sage-700 hover:bg-sage-100"
                onClick={() => setPref('reminderTemplate2h', template.content)}
              >
                Usar {template.name}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-neutral-400">
          Variáveis: <code className="bg-neutral-100 px-1 rounded">{'{{nome}}'}</code>{' '}
          <code className="bg-neutral-100 px-1 rounded">{'{{data}}'}</code>{' '}
          <code className="bg-neutral-100 px-1 rounded">{'{{hora}}'}</code>
        </p>
        <textarea rows={3} className="input-field resize-none text-sm"
          disabled={!hasProAutomation}
          value={prefs.reminderTemplate2h}
          onChange={e => setPref('reminderTemplate2h', e.target.value)} />
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Prévia para paciente</p>
          <p className="whitespace-pre-line text-sm text-neutral-700">{previewMessage(prefs.reminderTemplate2h)}</p>
        </div>
        <button type="button" className="btn-secondary text-xs w-fit"
          disabled={!hasProAutomation || createTemplate.isPending}
          onClick={() => saveTemplate('whatsapp_message', 'Lembrete 1h personalizado', prefs.reminderTemplate2h)}>
          Salvar como template
        </button>
      </div>

      <div className="flex justify-end">
        <button onClick={() => savePrefs('Mensagens')} disabled={savingPrefs || !hasProAutomation} className="btn-primary flex items-center gap-2">
          {savingPrefs && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Salvar mensagens
        </button>
      </div>
    </div>
  )
}
