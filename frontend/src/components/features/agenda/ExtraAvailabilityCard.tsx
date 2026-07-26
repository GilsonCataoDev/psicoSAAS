import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { XCircle } from 'lucide-react'
import { formatTime } from '@/lib/utils'

type BookingModality = 'presencial' | 'online'

type ExtraAvailabilityForm = {
  date: string
  startTime: string
  endTime: string
  modality: BookingModality
}

type ExtraAvailabilitySlot = {
  id: string
  date: string
  startTime: string
  endTime: string
  modality?: BookingModality
}

type ExtraAvailabilityCardProps = {
  form: ExtraAvailabilityForm
  onFormChange: (updater: (form: ExtraAvailabilityForm) => ExtraAvailabilityForm) => void
  slots: ExtraAvailabilitySlot[]
  onAddSlot: () => void
  onRemoveSlot: (id: string) => void
  isAdding: boolean
  isRemoving: boolean
}

export default function ExtraAvailabilityCard({
  form,
  onFormChange,
  slots,
  onAddSlot,
  onRemoveSlot,
  isAdding,
  isRemoving,
}: ExtraAvailabilityCardProps) {
  return (
    <details className="order-6 card group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <div>
          <h2 className="section-title">Horário extra</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-300">
            Libere um horário pontual no link público quando precisar.
          </p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage-50 text-lg text-sage-700 transition-transform group-open:rotate-45 dark:bg-sage-500/15 dark:text-sage-200">+</span>
      </summary>
      <div className="mt-4 space-y-4 border-t border-neutral-100 pt-4 dark:border-white/10">
        <div className="grid gap-3 md:grid-cols-[1fr_120px_120px_150px_auto]">
          <input
            type="date"
            value={form.date}
            onChange={e => onFormChange(current => ({ ...current, date: e.target.value }))}
            className="input-field"
          />
          <input
            type="time"
            value={form.startTime}
            onChange={e => onFormChange(current => ({ ...current, startTime: e.target.value }))}
            className="input-field"
          />
          <input
            type="time"
            value={form.endTime}
            onChange={e => onFormChange(current => ({ ...current, endTime: e.target.value }))}
            className="input-field"
          />
          <select
            value={form.modality}
            onChange={e => onFormChange(current => ({ ...current, modality: e.target.value as BookingModality }))}
            className="input-field"
          >
            <option value="online">Online</option>
            <option value="presencial">Presencial</option>
          </select>
          <button
            type="button"
            onClick={onAddSlot}
            disabled={isAdding}
            className="btn-primary whitespace-nowrap"
          >
            {isAdding ? 'Abrindo...' : 'Abrir horário'}
          </button>
        </div>
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-white/10 dark:bg-white/5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-300">
              Horários extras abertos
            </p>
            <span className="text-xs text-neutral-400">
              {slots.length} {slots.length === 1 ? 'ativo' : 'ativos'}
            </span>
          </div>
          {slots.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhum horário extra aberto.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {slots.map(slot => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-sage-100 bg-white px-3 py-2 text-sm text-neutral-700 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {format(parseISO(String(slot.date).slice(0, 10)), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-300">
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)} · {slot.modality === 'online' ? 'Online' : 'Presencial'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveSlot(slot.id)}
                    disabled={isRemoving}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-rose-100 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-400/30 dark:text-rose-200 dark:hover:bg-rose-400/10"
                    title="Retirar horário extra"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Retirar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </details>
  )
}
