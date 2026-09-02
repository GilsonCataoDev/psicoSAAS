import { useRef, useState } from 'react'
import { Download, FileUp, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { downloadPatientsImportTemplate, ImportPatientsResult, useImportPatients } from '@/hooks/useApi'
import ImportResultsView from './ImportResultsView'
import { useTerms } from '@/hooks/useTerms'

export default function ImportPatientsModal({
  open,
  onClose,
  reachedPatientLimit,
  currentPlanName,
}: {
  open: boolean
  onClose: () => void
  reachedPatientLimit: boolean
  currentPlanName: string
}) {
  const t = useTerms()
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportPatientsResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importMutation = useImportPatients()

  function reset() {
    setFile(null)
    setResult(null)
    importMutation.reset()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    if (!selected) return
    if (!/\.csv$/i.test(selected.name)) {
      toast.error('Envie um arquivo .csv')
      return
    }
    setFile(selected)
  }

  async function handleSubmit() {
    if (!file) return
    try {
      const data = await importMutation.mutateAsync(file)
      setResult(data)
    } catch {
      toast.error('Não foi possível importar o arquivo. Tente novamente.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Importar ${t.patients} via CSV`}
      description={result ? undefined : `Migre sua lista de ${t.patients} de uma planilha ou outro sistema.`}
      size="md"
    >
      {result ? (
        <ImportResultsView
          result={result}
          onImportAnother={reset}
          onDone={handleClose}
        />
      ) : (
        <div className="space-y-4">
          {reachedPatientLimit && (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              Você já atingiu o limite de {t.patients} ativos do plano {currentPlanName}. Ainda dá pra importar e ver os
              erros de validação, mas os {t.patients} além do limite ficarão pendentes de upgrade.
            </p>
          )}

          <button
            type="button"
            onClick={() => downloadPatientsImportTemplate()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 p-3 text-sm font-medium text-neutral-600 hover:border-sage-400 hover:text-sage-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Baixar modelo (.csv)
          </button>

          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 p-6 text-center cursor-pointer hover:border-sage-300 transition-colors">
            <FileUp className="h-6 w-6 text-neutral-400" />
            <span className="text-sm text-neutral-600">
              {file ? file.name : 'Clique para selecionar o arquivo .csv preenchido'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <p className="text-xs text-neutral-400">
            Financeiro: {t.patients} de pacote mensal importados só começam a ser cobrados no próximo ciclo, não
            imediatamente.
          </p>

          <button
            onClick={handleSubmit}
            disabled={!file || importMutation.isPending}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {importMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {importMutation.isPending ? 'Importando...' : 'Importar'}
          </button>
        </div>
      )}
    </Modal>
  )
}
