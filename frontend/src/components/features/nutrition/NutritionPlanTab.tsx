import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronUp, UtensilsCrossed } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'
import {
  useNutritionPlans,
  useCreateNutritionPlan,
  useUpdateNutritionPlan,
  useDeleteNutritionPlan,
  type CreateNutritionPlanInput,
} from '@/hooks/useApi'
import type { NutritionPlan } from '@/types'

interface Props {
  patientId: string
}

interface PlanFormState {
  title: string
  content: string
  totalCalories: string
  validFrom: string
  validUntil: string
}

const EMPTY_FORM: PlanFormState = {
  title: '',
  content: '',
  totalCalories: '',
  validFrom: '',
  validUntil: '',
}

function formToInput(form: PlanFormState, patientId: string): CreateNutritionPlanInput {
  return {
    patientId,
    title: form.title.trim() || undefined,
    content: form.content,
    totalCalories: form.totalCalories ? Number(form.totalCalories) : undefined,
    validFrom: form.validFrom || undefined,
    validUntil: form.validUntil || undefined,
  }
}

function planToForm(plan: NutritionPlan): PlanFormState {
  return {
    title: plan.title,
    content: plan.content,
    totalCalories: plan.totalCalories != null ? String(plan.totalCalories) : '',
    validFrom: plan.validFrom ?? '',
    validUntil: plan.validUntil ?? '',
  }
}

export default function NutritionPlanTab({ patientId }: Props) {
  const { data: plans = [], isLoading } = useNutritionPlans(patientId)
  const createPlan = useCreateNutritionPlan()
  const updatePlan = useUpdateNutritionPlan(patientId)
  const deletePlan = useDeleteNutritionPlan(patientId)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM)

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(plan: NutritionPlan) {
    setEditingId(plan.id)
    setForm(planToForm(plan))
    setShowForm(true)
    setExpandedId(null)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function setField(key: keyof PlanFormState, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.content.trim()) {
      toast.error('O conteúdo do plano alimentar é obrigatório.')
      return
    }
    if (editingId) {
      const { patientId: _pid, ...rest } = formToInput(form, patientId)
      await updatePlan.mutateAsync({ id: editingId, data: rest })
      toast.success('Plano alimentar atualizado')
    } else {
      await createPlan.mutateAsync(formToInput(form, patientId))
      toast.success('Plano alimentar criado')
    }
    cancelForm()
  }

  async function handleDelete(plan: NutritionPlan) {
    if (!window.confirm(`Excluir "${plan.title}"? Essa ação não pode ser desfeita.`)) return
    await deletePlan.mutateAsync(plan.id)
    toast.success('Plano alimentar excluído')
  }

  const isPending = createPlan.isPending || updatePlan.isPending

  return (
    <div className="space-y-4">
      {/* Cabecalho */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-sage-600" />
              <h2 className="section-title mb-0">Plano Alimentar</h2>
            </div>
            <p className="mt-1 text-sm text-neutral-400">
              Prescrição dietética — Resolução CFN 600/2018.
              O conteúdo é criptografado e visível apenas para você.
            </p>
          </div>
          {!showForm && (
            <button type="button" onClick={openCreate} className="btn-primary shrink-0 text-sm flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              Novo plano
            </button>
          )}
        </div>

        {/* Formulário de criacao/edicao */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4 border-t border-neutral-100 pt-5">
            <div>
              <label className="label">Título</label>
              <input
                type="text"
                maxLength={200}
                placeholder="Plano Alimentar — Emagrecimento"
                value={form.title}
                onChange={e => setField('title', e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="label">
                Conteúdo <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={12}
                placeholder={
                  'Descreva o plano alimentar completo:\n\n' +
                  '## Café da manhã\n- Opção 1: ...\n\n## Lanche da manhã\n- ...\n\n## Almoço\n- ...'
                }
                value={form.content}
                onChange={e => setField('content', e.target.value)}
                className="input-field resize-y font-mono text-sm"
                required
              />
              <p className="mt-1 text-xs text-neutral-400">Suporta formatação em markdown (títulos, listas, tabelas).</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Total de kcal/dia (opcional)</label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  placeholder="Ex: 2000"
                  value={form.totalCalories}
                  onChange={e => setField('totalCalories', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Vigência — início (opcional)</label>
                <input
                  type="date"
                  value={form.validFrom}
                  onChange={e => setField('validFrom', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Vigência — fim (opcional)</label>
                <input
                  type="date"
                  value={form.validUntil}
                  onChange={e => setField('validUntil', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-neutral-100 pt-4">
              <button type="button" onClick={cancelForm} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={isPending} className="btn-primary flex items-center gap-2">
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? 'Salvar alterações' : 'Criar plano'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Lista de planos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-10 text-center">
          <UtensilsCrossed className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-3 font-medium text-neutral-600">Nenhum plano alimentar registrado</p>
          <p className="mt-1 text-sm text-neutral-400">
            Crie o primeiro plano usando o botão acima.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => {
            const isExpanded = expandedId === plan.id
            return (
              <div key={plan.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-neutral-800 truncate">{plan.title}</h3>
                      {plan.totalCalories && (
                        <span className="shrink-0 rounded-full bg-sage-100 px-2 py-0.5 text-xs font-medium text-sage-700">
                          {plan.totalCalories} kcal/dia
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-neutral-400">
                      <span>Criado em {formatDate(plan.createdAt)}</span>
                      {plan.validFrom && plan.validUntil && (
                        <span>
                          Vigência: {formatDate(plan.validFrom)} — {formatDate(plan.validUntil)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : plan.id)}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                      title={isExpanded ? 'Recolher' : 'Expandir'}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(plan)}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                      title="Editar plano"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(plan)}
                      disabled={deletePlan.isPending}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Excluir plano"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 border-t border-neutral-100 pt-4">
                    <pre className="whitespace-pre-wrap rounded-xl bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-700 font-mono">
                      {plan.content}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
