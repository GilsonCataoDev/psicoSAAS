import { useState } from 'react'
import { Activity, Plus, Scale, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import LightweightChart from '@/components/ui/LightweightChart'
import Modal from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import { useCreateNutritionAssessment, useDeleteNutritionAssessment, useNutritionAssessments } from '@/hooks/useApi'

type Props = { patientId: string }

const toNumber = (value: string) => Number(value.replace(',', '.'))

/** Classificação ABESO/OMS pelo IMC. */
function classifyImc(imc: number): string {
  if (imc < 18.5) return 'Abaixo do peso'
  if (imc < 25)   return 'Peso normal'
  if (imc < 30)   return 'Sobrepeso'
  if (imc < 35)   return 'Obesidade grau I'
  if (imc < 40)   return 'Obesidade grau II'
  return 'Obesidade grau III'
}

/** Calcula o IMC (kg/m²) a partir de peso (kg) e altura (cm). Retorna null se os dados forem inválidos. */
function calcImcPreview(weightStr: string, heightStr: string): { value: number; label: string } | null {
  const w = toNumber(weightStr)
  const h = toNumber(heightStr)
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null
  const imc = w / ((h / 100) ** 2)
  return { value: Number(imc.toFixed(1)), label: classifyImc(imc) }
}

export default function NutritionProgressPanel({ patientId }: Props) {
  const { data: assessments = [], isLoading } = useNutritionAssessments(patientId)
  const createAssessment = useCreateNutritionAssessment()
  const deleteAssessment = useDeleteNutritionAssessment(patientId)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    assessedAt: new Date().toISOString().slice(0, 10), weightKg: '', heightCm: '', waistCm: '', bodyFatPercent: '', notes: '',
  })

  const latest = assessments[assessments.length - 1]
  const chartData = assessments.map(item => ({
    label: item.assessedAt.slice(5).split('-').reverse().join('/'),
    value: item.weightKg,
  }))

  async function save() {
    const weightKg = toNumber(form.weightKg)
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      toast.error('Informe um peso válido.')
      return
    }
    const optionalNumber = (value: string) => value.trim() ? toNumber(value) : undefined
    try {
      await createAssessment.mutateAsync({
        patientId,
        assessedAt: form.assessedAt,
        weightKg,
        heightCm: optionalNumber(form.heightCm),
        waistCm: optionalNumber(form.waistCm),
        bodyFatPercent: optionalNumber(form.bodyFatPercent),
        notes: form.notes.trim() || undefined,
      })
      setOpen(false)
      setForm({ assessedAt: new Date().toISOString().slice(0, 10), weightKg: '', heightCm: '', waistCm: '', bodyFatPercent: '', notes: '' })
      toast.success('Avaliação antropométrica salva')
    } catch { /* feedback centralizado no hook */ }
  }

  async function remove(id: string) {
    if (!window.confirm('Excluir este registro antropométrico?')) return
    try {
      await deleteAssessment.mutateAsync(id)
      toast.success('Registro excluído')
    } catch { /* feedback centralizado no hook */ }
  }

  return (
    <section className="card space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="rounded-xl bg-sage-100 p-2.5 text-sage-700 dark:bg-sage-900/50 dark:text-sage-200"><Activity className="h-5 w-5" /></span>
          <div>
            <h2 className="font-semibold text-neutral-900 dark:text-white">Evolução antropométrica</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-300">Registre medidas por data e acompanhe a evolução do peso.</p>
          </div>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="btn-primary shrink-0 inline-flex items-center justify-center gap-1.5 text-sm">
          <Plus className="h-4 w-4" /> Nova avaliação
        </button>
      </div>

      {isLoading ? <div className="h-36 animate-pulse rounded-xl bg-neutral-100 dark:bg-white/5" /> : assessments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 px-4 py-7 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-300">
          Ainda não há medidas registradas para esta pessoa.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Último peso" value={`${latest!.weightKg.toFixed(1)} kg`} />
            <Metric label="IMC atual" value={latest?.imc ? `${latest.imc} · ${classifyImc(latest.imc)}` : '—'} />
            <Metric label="Cintura" value={latest?.waistCm ? `${latest.waistCm} cm` : '—'} />
            <Metric label="% gordura" value={latest?.bodyFatPercent ? `${latest.bodyFatPercent}%` : '—'} />
          </div>
          <div className="h-44 rounded-xl border border-neutral-100 bg-neutral-50/60 px-2 pt-2 dark:border-white/10 dark:bg-white/[0.03]">
            <LightweightChart data={chartData} color="#34836a" showYAxis formatValue={value => `${value.toFixed(1)} kg`} />
          </div>
          <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-100 dark:divide-white/10 dark:border-white/10">
            {[...assessments].reverse().slice(0, 5).map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">{formatDate(item.assessedAt)} · {item.weightKg.toFixed(1)} kg</span>
                  {item.imc && <span className="ml-2 text-neutral-400">IMC {item.imc} · {classifyImc(item.imc)}</span>}
                  {item.notes && <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-300">{item.notes}</p>}
                </div>
                <button type="button" aria-label="Excluir registro" onClick={() => remove(item.id)} disabled={deleteAssessment.isPending} className="rounded-lg p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-xs text-neutral-400">Indicadores para apoio ao registro. A interpretação clínica é responsabilidade da nutricionista.</p>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova avaliação antropométrica">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data"><input type="date" value={form.assessedAt} onChange={e => setForm({ ...form, assessedAt: e.target.value })} className="input-field w-full" /></Field>
            <Field label="Peso (kg) *"><input autoFocus inputMode="decimal" value={form.weightKg} onChange={e => setForm({ ...form, weightKg: e.target.value })} className="input-field w-full" placeholder="Ex.: 68,5" /></Field>
            <Field label="Altura (cm)"><input inputMode="decimal" value={form.heightCm} onChange={e => setForm({ ...form, heightCm: e.target.value })} className="input-field w-full" placeholder="Ex.: 165" /></Field>
            <Field label="Cintura (cm)"><input inputMode="decimal" value={form.waistCm} onChange={e => setForm({ ...form, waistCm: e.target.value })} className="input-field w-full" placeholder="Ex.: 78" /></Field>
            <Field label="Gordura corporal (%)"><input inputMode="decimal" value={form.bodyFatPercent} onChange={e => setForm({ ...form, bodyFatPercent: e.target.value })} className="input-field w-full" placeholder="Opcional" /></Field>
          </div>
          {(() => {
            const preview = calcImcPreview(form.weightKg, form.heightCm)
            return preview ? (
              <div className="flex items-center gap-2 rounded-lg bg-sage-50 px-3 py-2 text-sm dark:bg-sage-900/30">
                <span className="font-semibold text-sage-700 dark:text-sage-300">IMC {preview.value}</span>
                <span className="text-neutral-500 dark:text-neutral-400">·</span>
                <span className="text-neutral-600 dark:text-neutral-300">{preview.label}</span>
              </div>
            ) : null
          })()}
          <Field label="Observações"><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-field min-h-20 w-full resize-y" placeholder="Opcional" maxLength={4000} /></Field>
          <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancelar</button><button type="button" className="btn-primary inline-flex items-center gap-1.5" disabled={createAssessment.isPending} onClick={save}><Scale className="h-4 w-4" />{createAssessment.isPending ? 'Salvando...' : 'Salvar avaliação'}</button></div>
        </div>
      </Modal>
    </section>
  )
}

function Metric({ label, value }: { label: string, value: string }) {
  return <div className="rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-white/[0.04]"><p className="text-xs text-neutral-400">{label}</p><p className="mt-1 font-semibold text-neutral-800 dark:text-neutral-100">{value}</p></div>
}

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{label}</span>{children}</label>
}
