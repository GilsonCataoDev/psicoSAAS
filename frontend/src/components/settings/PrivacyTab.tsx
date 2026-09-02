import { BarChart3, Download, Trash2 } from 'lucide-react'
import UseCogniaIcon from '@/components/ui/UseCogniaIcon'
import { type AuditLog, AUDIT_LABELS } from './types'
import { useTerms } from '@/hooks/useTerms'

interface Props {
  analyticsEnabled: boolean
  updateAnalyticsConsent: (enabled: boolean) => void
  exportingData: boolean
  loadingAudit: boolean
  auditLogs: AuditLog[]
  deletePassword: string
  setDeletePassword: (v: string) => void
  deleteConfirm: string
  setDeleteConfirm: (v: string) => void
  deletingAccount: boolean
  exportData: () => void
  deleteAccount: () => void
}

export function PrivacyTab({
  analyticsEnabled, updateAnalyticsConsent,
  exportingData, loadingAudit, auditLogs,
  deletePassword, setDeletePassword, deleteConfirm, setDeleteConfirm,
  deletingAccount, exportData, deleteAccount,
}: Props) {
  const t = useTerms()
  return (
    <div className="card space-y-4">
      <h2 className="section-title">Privacidade</h2>
      <div className="space-y-3 text-sm text-neutral-600">
        {[
          { icon: 'security-lgpd' as const, text: 'Todas as anotações clínicas são criptografadas com AES-256.' },
          { icon: 'documents' as const, text: `Voce e o unico responsavel pelos dados de seus ${t.patients}; nunca os vendemos ou compartilhamos.` },
          { icon: 'billing' as const, text: 'Voce pode exportar ou deletar todos os seus dados a qualquer momento.' },
        ].map(item => (
          <div key={item.text} className="flex gap-3 p-3 bg-neutral-50 rounded-xl">
            <UseCogniaIcon name={item.icon} size={24} />
            <p>{item.text}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <div className="rounded-xl bg-sage-100 p-2 text-sage-700 dark:bg-sage-500/20 dark:text-sage-200">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Métricas de uso protegidas</h3>
              <p className="mt-1 text-sm leading-5 text-neutral-600 dark:text-neutral-300">
                Ajuda a entender quais recursos precisam melhorar. Não inclui nomes, dados de {t.patients},
                {t.record}s, documentos, mensagens ou valores e não grava sua tela.
              </p>
              <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-400">
                Esta escolha vale somente para este navegador e pode ser alterada quando quiser.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={analyticsEnabled}
            aria-label="Permitir métricas de uso"
            onClick={() => updateAnalyticsConsent(!analyticsEnabled)}
            className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors ${analyticsEnabled ? 'bg-sage-600' : 'bg-neutral-300 dark:bg-neutral-600'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${analyticsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>
      <button className="btn-secondary text-sm flex items-center gap-2 w-fit"
        disabled={exportingData}
        onClick={exportData}>
        <Download className="w-4 h-4" />
        {exportingData ? 'Exportando...' : 'Exportar meus dados'}
      </button>
      <div className="rounded-2xl border border-sage-100 bg-sage-50 px-4 py-3 text-sm text-sage-800">
        <p className="font-medium">O arquivo de exportação inclui</p>
        <p className="mt-1 text-sage-700">
          {t.patientsCapitalized}, agenda, {t.sessions}, registros financeiros, documentos, preferências e histórico disponível da conta.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-neutral-800">Auditoria recente</h3>
            <p className="text-xs text-neutral-400">Ultimas acoes sensiveis registradas na sua conta.</p>
          </div>
          {loadingAudit && <span className="text-xs text-neutral-400">Carregando...</span>}
        </div>

        <div className="mt-4 space-y-2">
          {auditLogs.length === 0 && !loadingAudit ? (
            <p className="text-sm text-neutral-500">Nenhum evento registrado ainda.</p>
          ) : auditLogs.slice(0, 8).map((log) => (
            <div key={log.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm">
              <span className="font-medium text-neutral-700">{AUDIT_LABELS[log.action] ?? log.action}</span>
              <span className="shrink-0 text-xs text-neutral-400">
                {new Date(log.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-400/20 dark:bg-rose-500/10">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-rose-100 p-2 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300">
            <Trash2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-200">Excluir conta definitivamente</h3>
              <p className="mt-1 text-sm text-rose-700 dark:text-rose-200/80">
                Se voce apenas testou e nao quiser manter cadastro, remova sua conta aqui. Isso apaga {t.patients},
                prontuarios, sessoes, agenda, financeiro, documentos, preferencias e tokens de acesso. Assinaturas
                ativas tambem sao canceladas antes da exclusao. Esta acao nao pode ser desfeita.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label text-rose-700 dark:text-rose-200">Senha atual</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  className="input-field"
                  placeholder="Confirme sua senha"
                />
              </div>
              <div>
                <label className="label text-rose-700 dark:text-rose-200">Digite EXCLUIR</label>
                <input
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  className="input-field"
                  placeholder="EXCLUIR"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={deleteAccount}
              disabled={deletingAccount || deleteConfirm !== 'EXCLUIR' || deletePassword.length < 8}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {deletingAccount ? 'Excluindo...' : 'Excluir minha conta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
