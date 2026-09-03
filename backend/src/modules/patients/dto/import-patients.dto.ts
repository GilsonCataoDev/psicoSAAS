export type ImportSkipReason = 'duplicate' | 'plan_limit_reached'

export type ImportResultDto = {
  totalRows: number
  importedCount: number
  skippedCount: number
  errorCount: number
  imported: Array<{ row: number; id: string; name: string }>
  skipped: Array<{ row: number; name?: string; reason: ImportSkipReason; details?: string }>
  errors: Array<{ row: number; name?: string; errors: string[] }>
  upgradeUrl?: string
  currentPlan?: string
}
