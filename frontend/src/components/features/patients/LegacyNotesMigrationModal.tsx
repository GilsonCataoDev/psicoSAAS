import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, FilePlus2, FileText, Image, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { useCreateHistoricalSession, useUploadPatientAttachment } from '@/hooks/useApi'
import {
  LEGACY_NOTES_MAX_ENTRIES,
  LegacyNoteDraft,
  validateLegacyNoteDrafts,
  validateLegacyNoteFiles,
} from '@/lib/legacy-notes-migration'
import { useTerms } from '@/hooks/useTerms'

type SelectedPage = {
  file: File
  previewUrl: string
  uploaded: boolean
}

type Props = {
  open: boolean
  onClose: () => void
  patientId: string
  patientName: string
  sessionDuration?: number
}

function newDraft(): LegacyNoteDraft {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    summary: '',
  }
}

export default function LegacyNotesMigrationModal({
  open,
  onClose,
  patientId,
  patientName,
  sessionDuration = 50,
}: Props) {
  const t = useTerms()
  const uploadAttachment = useUploadPatientAttachment(patientId)
  const createSession = useCreateHistoricalSession()
  const [pages, setPages] = useState<SelectedPage[]>([])
  const [drafts, setDrafts] = useState<LegacyNoteDraft[]>([newDraft()])
  const [activePage, setActivePage] = useState(0)
  const [reviewed, setReviewed] = useState(false)
  const [saving, setSaving] = useState(false)
  const previewUrls = useRef<string[]>([])

  const isBusy = saving || uploadAttachment.isPending || createSession.isPending
  const completedDrafts = useMemo(() => drafts.filter(draft => draft.created).length, [drafts])

  useEffect(() => () => {
    previewUrls.current.forEach(url => URL.revokeObjectURL(url))
  }, [])

  function clearPreviewUrls() {
    previewUrls.current.forEach(url => URL.revokeObjectURL(url))
    previewUrls.current = []
  }

  function resetAndClose() {
    if (isBusy) return
    clearPreviewUrls()
    setPages([])
    setDrafts([newDraft()])
    setActivePage(0)
    setReviewed(false)
    onClose()
  }

  function addPages(selected: File[]) {
    if (selected.length === 0) return
    const combinedFiles = [...pages.map(page => page.file), ...selected]
    const validation = validateLegacyNoteFiles(combinedFiles)
    if (validation) {
      toast.error(validation)
      return
    }
    const addedPages = selected.map(file => ({ file, previewUrl: URL.createObjectURL(file), uploaded: false }))
    previewUrls.current.push(...addedPages.map(page => page.previewUrl))
    setPages(current => [...current, ...addedPages])
    setActivePage(combinedFiles.length - 1)
    setReviewed(false)
  }

  function removePage(index: number) {
    const page = pages[index]
    if (!page || page.uploaded) return
    URL.revokeObjectURL(page.previewUrl)
    previewUrls.current = previewUrls.current.filter(url => url !== page.previewUrl)
    setPages(current => current.filter((_, pageIndex) => pageIndex !== index))
    setActivePage(current => Math.max(0, Math.min(current, pages.length - 2)))
    setReviewed(false)
  }

  function updateDraft(id: string, patch: Partial<LegacyNoteDraft>) {
    setDrafts(current => current.map(draft => draft.id === id ? { ...draft, ...patch, created: false } : draft))
    setReviewed(false)
  }

  function removeDraft(id: string) {
    if (drafts.length === 1) return
    setDrafts(current => current.filter(draft => draft.id !== id))
    setReviewed(false)
  }

  async function migrate() {
    const fileError = validateLegacyNoteFiles(pages.map(page => page.file))
    const draftError = validateLegacyNoteDrafts(drafts)
    if (fileError || draftError) {
      toast.error(fileError ?? draftError!)
      return
    }
    if (!reviewed) {
      toast.error('Confirme que você revisou as transcrições.')
      return
    }

    setSaving(true)
    try {
      for (let index = 0; index < pages.length; index += 1) {
        if (pages[index].uploaded) continue
        await uploadAttachment.mutateAsync({ file: pages[index].file, kind: 'supporting_document' })
        setPages(current => current.map((page, pageIndex) => pageIndex === index ? { ...page, uploaded: true } : page))
      }

      for (const draft of drafts) {
        if (draft.created) continue
        await createSession.mutateAsync({
          patientId,
          date: draft.date,
          summary: draft.summary.trim(),
          duration: sessionDuration,
          paymentStatus: 'waived',
          tags: [],
        })
        setDrafts(current => current.map(item => item.id === draft.id ? { ...item, created: true } : item))
      }

      toast.success(`${drafts.length} evolução${drafts.length === 1 ? '' : 'ões'} migrada${drafts.length === 1 ? '' : 's'} com os originais anexados.`)
      clearPreviewUrls()
      setPages([])
      setDrafts([newDraft()])
      setActivePage(0)
      setReviewed(false)
      onClose()
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'A migração foi interrompida. O que já foi salvo não será repetido ao tentar novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title="Migrar anotações em papel"
      description={`Digitalize até duas páginas de ${patientName} e revise cada evolução antes de salvar.`}
      size="xl"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-100">1. Originais</p>
              <p className="text-xs text-neutral-400">Uma foto por página ou um PDF com até duas páginas.</p>
            </div>
            <label className={`btn-secondary cursor-pointer text-sm ${isBusy || pages.length >= 2 ? 'pointer-events-none opacity-60' : ''}`}>
              <FilePlus2 className="mr-1.5 inline h-4 w-4" />{pages.length === 0 ? 'Selecionar' : 'Adicionar página'}
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                capture="environment"
                multiple
                disabled={isBusy || pages.length >= 2}
                className="hidden"
                onChange={event => {
                  addPages(Array.from(event.target.files ?? []))
                  event.target.value = ''
                }}
              />
            </label>
          </div>

          {pages.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-5 text-center dark:border-white/10 dark:bg-white/5">
              <Image className="h-9 w-9 text-neutral-300" />
              <p className="mt-3 text-sm font-medium text-neutral-600 dark:text-neutral-200">Fotografe ou escolha até duas páginas</p>
              <p className="mt-1 max-w-sm text-xs text-neutral-400">Os arquivos serão criptografados e anexados somente a este {t.patient}.</p>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                {pages.map((page, index) => (
                  <div key={`${page.file.name}-${index}`} className={`flex items-center rounded-xl transition-colors ${activePage === index ? 'bg-sage-600 text-white' : 'bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-200'}`}>
                    <button type="button" onClick={() => setActivePage(index)} className="px-3 py-2 text-xs font-semibold">
                      Página {index + 1}{page.uploaded ? ' · anexada' : ''}
                    </button>
                    {!page.uploaded && (
                      <button type="button" onClick={() => removePage(index)} disabled={isBusy} className="mr-1 rounded-md p-1 opacity-70 hover:bg-black/10 hover:opacity-100" title={`Remover página ${index + 1}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-black/20">
                {pages[activePage]?.file.type === 'application/pdf' ? (
                  <iframe title={pages[activePage].file.name} src={pages[activePage].previewUrl} className="h-[52vh] min-h-80 w-full" />
                ) : (
                  <img src={pages[activePage]?.previewUrl} alt={`Página ${activePage + 1}`} className="h-[52vh] min-h-80 w-full object-contain" />
                )}
              </div>
            </>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-100">2. Evoluções revisadas</p>
              <p className="text-xs text-neutral-400">Separe cada {t.session} encontrada nas páginas.</p>
            </div>
            <button
              type="button"
              onClick={() => setDrafts(current => [...current, newDraft()])}
              disabled={isBusy || drafts.length >= LEGACY_NOTES_MAX_ENTRIES}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              <Plus className="mr-1 inline h-4 w-4" />Evolução
            </button>
          </div>

          <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
            {drafts.map((draft, index) => (
              <div key={draft.id} className="rounded-2xl border border-neutral-200 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-100">
                    {draft.created ? <CheckCircle2 className="h-4 w-4 text-sage-600" /> : <FileText className="h-4 w-4 text-sage-600" />}
                    Evolução {index + 1}{draft.created ? ' · salva' : ''}
                  </p>
                  {drafts.length > 1 && !draft.created && (
                    <button type="button" onClick={() => removeDraft(draft.id)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-500" title="Remover evolução">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="label">Data da {t.session}</label>
                    <input type="date" value={draft.date} disabled={draft.created || isBusy} onChange={event => updateDraft(draft.id, { date: event.target.value })} className="input-field text-sm" />
                  </div>
                  <div>
                    <label className="label">Transcrição revisada</label>
                    <textarea
                      rows={5}
                      value={draft.summary}
                      disabled={draft.created || isBusy}
                      onChange={event => updateDraft(draft.id, { summary: event.target.value })}
                      className="input-field resize-y text-sm"
                      placeholder={`Digite exatamente o registro desta ${t.session}. Confira nomes, datas e termos clínicos antes de salvar.`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-sage-100 bg-sage-50/70 p-3 text-sm text-sage-800 dark:border-sage-400/20 dark:bg-sage-500/10 dark:text-sage-100">
            <input type="checkbox" checked={reviewed} disabled={isBusy} onChange={event => setReviewed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-sage-600" />
            <span>
              <span className="font-semibold">Revisei as transcrições.</span>
              <span className="mt-0.5 block text-xs opacity-80">O sistema não interpreta a caligrafia nem altera o conteúdo clínico.</span>
            </span>
          </label>
        </section>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-neutral-100 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs text-neutral-400">
          <ShieldCheck className="h-4 w-4 text-sage-600" />
          {completedDrafts > 0 ? `${completedDrafts} evolução(ões) já salva(s).` : `Nada entra no ${t.record} sem sua confirmação.`}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={resetAndClose} disabled={isBusy} className="btn-secondary flex-1 text-sm sm:flex-none">Cancelar</button>
          <button type="button" onClick={migrate} disabled={isBusy || !reviewed} className="btn-primary flex-1 text-sm disabled:opacity-50 sm:flex-none">
            {isBusy ? <><Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" />Salvando...</> : 'Confirmar migração'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
