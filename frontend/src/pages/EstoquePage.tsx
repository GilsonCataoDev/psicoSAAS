import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Package, Plus, Pencil, Trash2, AlertTriangle, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { hasAestheticsModules } from '@/lib/professions'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface InventoryItem {
  id: string
  name: string
  category?: string
  unit: string
  quantity: number
  minQuantity?: number
  supplier?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// ─── Schema Zod ───────────────────────────────────────────────────────────────

const itemSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(200),
  category: z.string().max(100).optional().or(z.literal('')),
  unit: z.string().min(1, 'Unidade obrigatória').max(20),
  quantity: z.coerce.number().min(0, 'Quantidade não pode ser negativa'),
  minQuantity: z.coerce.number().positive('Deve ser positivo').optional().or(z.literal('')),
  supplier: z.string().max(200).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
})

type ItemFormValues = z.infer<typeof itemSchema>

// ─── Utilitários ──────────────────────────────────────────────────────────────

function isLowStock(item: InventoryItem): boolean {
  return (
    item.minQuantity != null &&
    Number(item.quantity) <= Number(item.minQuantity)
  )
}

function formatQty(n: number | string): string {
  return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

// ─── Modal de produto ─────────────────────────────────────────────────────────

function ItemModal({
  item,
  onClose,
  onSaved,
}: {
  item: InventoryItem | null
  onClose: () => void
  onSaved: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: item
      ? {
          name: item.name,
          category: item.category ?? '',
          unit: item.unit,
          quantity: item.quantity,
          minQuantity: item.minQuantity ?? '',
          supplier: item.supplier ?? '',
          notes: item.notes ?? '',
        }
      : { name: '', category: '', unit: '', quantity: 0, minQuantity: '', supplier: '', notes: '' },
  })

  useEffect(() => { reset() }, [item, reset])

  async function onSubmit(values: ItemFormValues) {
    const payload = {
      name: values.name,
      category: values.category || undefined,
      unit: values.unit,
      quantity: values.quantity,
      minQuantity: values.minQuantity !== '' && values.minQuantity != null ? Number(values.minQuantity) : undefined,
      supplier: values.supplier || undefined,
      notes: values.notes || undefined,
    }
    try {
      if (item) {
        await api.patch(`/inventory/${item.id}`, payload)
        toast.success('Produto atualizado')
      } else {
        await api.post('/inventory', payload)
        toast.success('Produto adicionado')
      }
      onSaved()
      onClose()
    } catch {
      toast.error('Não foi possível salvar o produto')
    }
  }

  const fieldClass =
    'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-sage-400 focus:outline-none focus:ring-1 focus:ring-sage-400 dark:border-white/10 dark:bg-cognia-panel dark:text-neutral-100 dark:placeholder-neutral-500'
  const labelClass = 'mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400'
  const errorClass = 'mt-1 text-xs text-red-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-white/10 dark:bg-cognia-panel">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-white/10">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {item ? 'Editar produto' : 'Novo produto'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-5">
          {/* Nome */}
          <div>
            <label className={labelClass}>Nome do produto *</label>
            <input {...register('name')} placeholder="Ex: Ácido hialurônico 2%" className={fieldClass} />
            {errors.name && <p className={errorClass}>{errors.name.message}</p>}
          </div>

          {/* Categoria + Unidade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Categoria</label>
              <input {...register('category')} placeholder="Ex: Sérum" className={fieldClass} />
              {errors.category && <p className={errorClass}>{errors.category.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Unidade *</label>
              <input {...register('unit')} placeholder="Ex: ml, g, unidades" className={fieldClass} />
              {errors.unit && <p className={errorClass}>{errors.unit.message}</p>}
            </div>
          </div>

          {/* Quantidade + Mínimo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Quantidade atual</label>
              <input
                {...register('quantity')}
                type="number"
                step="0.01"
                min="0"
                className={fieldClass}
              />
              {errors.quantity && <p className={errorClass}>{errors.quantity.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Quantidade mínima (alerta)</label>
              <input
                {...register('minQuantity')}
                type="number"
                step="0.01"
                min="0"
                placeholder="Opcional"
                className={fieldClass}
              />
              {errors.minQuantity && <p className={errorClass}>{errors.minQuantity.message}</p>}
            </div>
          </div>

          {/* Fornecedor */}
          <div>
            <label className={labelClass}>Fornecedor</label>
            <input {...register('supplier')} placeholder="Nome ou contato do fornecedor" className={fieldClass} />
            {errors.supplier && <p className={errorClass}>{errors.supplier.message}</p>}
          </div>

          {/* Observações */}
          <div>
            <label className={labelClass}>Observações</label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Instruções de armazenamento, validade, etc."
              className={`${fieldClass} resize-none`}
            />
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-sage-500 px-4 py-2 text-sm font-medium text-white hover:bg-sage-600 disabled:opacity-60"
            >
              {isSubmitting ? 'Salvando...' : item ? 'Salvar alterações' : 'Adicionar produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function EstoquePage() {
  const profession = useAuthStore((s) => s.user?.profession)
  const navigate = useNavigate()
  const canAccessInventory = hasAestheticsModules(profession)

  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [modalItem, setModalItem] = useState<InventoryItem | null | 'new'>(null)

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<InventoryItem[]>('/inventory')
      setItems(res.data)
    } catch {
      toast.error('Não foi possível carregar o estoque')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!canAccessInventory) {
      navigate('/dashboard', { replace: true })
      return
    }

    void loadItems()
  }, [canAccessInventory, loadItems, navigate])

  // O retorno precisa ficar depois dos hooks para manter a ordem entre renders.
  if (!canAccessInventory) return null

  async function handleDelete(item: InventoryItem) {
    if (!window.confirm(`Remover "${item.name}" do estoque?`)) return
    try {
      await api.delete(`/inventory/${item.id}`)
      toast.success('Produto removido')
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch {
      toast.error('Não foi possível remover o produto')
    }
  }

  // Categorias únicas para o filtro
  const categories = Array.from(
    new Set(items.map((i) => i.category).filter(Boolean) as string[]),
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'))

  const filtered = categoryFilter
    ? items.filter((i) => i.category === categoryFilter)
    : items

  const lowStockCount = items.filter(isLowStock).length

  return (
    <div className="animate-fade-in mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-50 text-sage-500 dark:bg-sage-500/10">
            <Package size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Estoque</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Controle de produtos e insumos
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalItem('new')}
          className="flex items-center gap-2 rounded-xl bg-sage-500 px-4 py-2 text-sm font-medium text-white hover:bg-sage-600"
        >
          <Plus size={16} />
          Novo produto
        </button>
      </div>

      {/* Alerta de estoque baixo */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            {lowStockCount === 1
              ? '1 produto abaixo do estoque mínimo.'
              : `${lowStockCount} produtos abaixo do estoque mínimo.`}
          </span>
        </div>
      )}

      {/* Filtro por categoria */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              categoryFilter === ''
                ? 'bg-sage-500 text-white'
                : 'border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-400 dark:hover:bg-white/5'
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-sage-500 text-white'
                  : 'border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-400 dark:hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Estado de carregamento */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-sage-200 border-t-sage-600" />
        </div>
      )}

      {/* Estado vazio */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-14 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-50 text-sage-400 dark:bg-sage-500/10">
            <Package size={28} />
          </div>
          <div className="text-center">
            <p className="font-medium text-neutral-700 dark:text-neutral-300">
              {categoryFilter ? 'Nenhum produto nessa categoria' : 'Estoque vazio'}
            </p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
              {categoryFilter
                ? 'Selecione outra categoria ou remova o filtro.'
                : 'Adicione seu primeiro produto para começar o controle de estoque.'}
            </p>
          </div>
          {!categoryFilter && (
            <button
              onClick={() => setModalItem('new')}
              className="flex items-center gap-2 rounded-xl bg-sage-500 px-4 py-2 text-sm font-medium text-white hover:bg-sage-600"
            >
              <Plus size={15} />
              Adicionar produto
            </button>
          )}
        </div>
      )}

      {/* Lista de produtos */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((item) => {
            const low = isLowStock(item)
            return (
              <div
                key={item.id}
                className={`rounded-xl border bg-white px-4 py-3 transition-shadow hover:shadow-sm dark:bg-cognia-panel ${
                  low
                    ? 'border-amber-200 dark:border-amber-500/30'
                    : 'border-neutral-100 dark:border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                        {item.name}
                      </span>
                      {item.category && (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-white/10 dark:text-neutral-400">
                          {item.category}
                        </span>
                      )}
                      {low && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                          <AlertTriangle size={10} />
                          Estoque baixo
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                      <span>
                        <span className={`font-medium ${low ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-700 dark:text-neutral-200'}`}>
                          {formatQty(item.quantity)}
                        </span>{' '}
                        {item.unit}
                        {item.minQuantity != null && (
                          <span className="text-neutral-400 dark:text-neutral-500">
                            {' '}/ mín. {formatQty(item.minQuantity)}
                          </span>
                        )}
                      </span>
                      {item.supplier && <span>Fornecedor: {item.supplier}</span>}
                    </div>

                    {item.notes && (
                      <p className="mt-1 truncate text-xs text-neutral-400 dark:text-neutral-500">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setModalItem(item)}
                      title="Editar"
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/10 dark:hover:text-neutral-300"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      title="Remover"
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modalItem !== null && (
        <ItemModal
          item={modalItem === 'new' ? null : modalItem}
          onClose={() => setModalItem(null)}
          onSaved={loadItems}
        />
      )}
    </div>
  )
}
