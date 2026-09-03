import { AlertTriangle, CheckCircle2, ExternalLink, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ImportPatientsResult } from '@/hooks/useApi'
import { safeInternalPath } from '@/lib/safeNavigation'
import { useTerms } from '@/hooks/useTerms'

export default function ImportResultsView({
  result,
  onImportAnother,
  onDone,
}: {
  result: ImportPatientsResult
  onImportAnother: () => void
  onDone: () => void
}) {
  const t = useTerms()
  const planLimited = result.skipped.filter(s => s.reason === 'plan_limit_reached')
  const duplicates = result.skipped.filter(s => s.reason === 'duplicate')
  const upgradePath = safeInternalPath(result.upgradeUrl)

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl bg-sage-50 p-4 text-sm text-sage-800 dark:bg-sage-950/30 dark:text-sage-200">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">
            {result.importedCount} de {result.totalRows} {result.totalRows !== 1 ? t.patients : t.patient} importado{result.importedCount !== 1 ? 's' : ''}
          </p>
          {(result.skippedCount > 0 || result.errorCount > 0) && (
            <p className="mt-0.5 text-xs opacity-80">
              {result.skippedCount > 0 && `${result.skippedCount} ignorado${result.skippedCount !== 1 ? 's' : ''}`}
              {result.skippedCount > 0 && result.errorCount > 0 && ' · '}
              {result.errorCount > 0 && `${result.errorCount} com erro${result.errorCount !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>
      </div>

      {planLimited.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {planLimited.length} {planLimited.length !== 1 ? t.patients : t.patient}{planLimited.length !== 1 ? ' não couberam' : ' não coube'} no limite do plano
              {result.currentPlan ? ` ${result.currentPlan}` : ''}.
            </p>
          </div>
          {upgradePath && (
            <Link to={upgradePath} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold underline">
              Fazer upgrade <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}

      {duplicates.length > 0 && (
        <div className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700 dark:bg-white/5 dark:text-neutral-300">
          <p className="font-medium mb-2">{duplicates.length} linha{duplicates.length !== 1 ? 's' : ''} ignorada{duplicates.length !== 1 ? 's' : ''} por duplicidade</p>
          <ul className="space-y-1 text-xs">
            {duplicates.map(d => (
              <li key={d.row}>Linha {d.row} — {d.name ?? 'sem nome'}: {d.details ?? 'já existe'}</li>
            ))}
          </ul>
        </div>
      )}

      {result.errors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          <div className="flex items-center gap-2 font-medium mb-2">
            <XCircle className="h-4 w-4 shrink-0" />
            <p>{result.errors.length} linha{result.errors.length !== 1 ? 's com erro' : ' com erro'}</p>
          </div>
          <ul className="space-y-1.5 text-xs max-h-48 overflow-y-auto">
            {result.errors.map(e => (
              <li key={e.row}>
                <span className="font-semibold">Linha {e.row}{e.name ? ` (${e.name})` : ''}:</span> {e.errors.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={onImportAnother} className="btn-secondary flex-1">Importar outro arquivo</button>
        <button onClick={onDone} className="btn-primary flex-1">Concluir</button>
      </div>
    </div>
  )
}
