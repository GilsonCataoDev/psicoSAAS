import { ArrowLeft, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAdminTestimonials, useAdminSetTestimonialApproval, AdminTestimonial } from '@/hooks/useApi'

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-neutral-400 text-sm">—</span>
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className="w-3.5 h-3.5"
          fill={rating >= n ? '#F59E0B' : 'transparent'}
          stroke={rating >= n ? '#F59E0B' : '#D1D5DB'}
        />
      ))}
    </div>
  )
}

function TestimonialRow({ item }: { item: AdminTestimonial }) {
  const toggle = useAdminSetTestimonialApproval()

  return (
    <tr className="hover:bg-neutral-50/60">
      <td className="px-4 py-3 text-xs text-neutral-400 whitespace-nowrap">
        {new Date(item.createdAt).toLocaleDateString('pt-BR')}
      </td>
      <td className="px-4 py-3">
        <StarRating rating={item.rating} />
      </td>
      <td className="px-4 py-3 text-sm text-neutral-700 max-w-xs">
        <p className="line-clamp-3">{item.text ?? <span className="text-neutral-400 italic">Sem texto</span>}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-neutral-700 truncate max-w-[160px]">{item.userName}</p>
        <p className="text-xs text-neutral-400 truncate max-w-[160px]">{item.userEmail}</p>
        <p className="mt-1 text-xs text-neutral-500">{item.publicIdentityConsent ? 'Identidade pública autorizada' : 'Somente primeiro nome'}</p>
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => toggle.mutate({ id: item.id, approvedForPublic: !item.approvedForPublic })}
          disabled={toggle.isPending || (!item.publicConsent && !item.approvedForPublic)}
          title={!item.publicConsent ? 'Sem autorização para divulgação' : undefined}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
            item.approvedForPublic
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
          }`}
        >
          {item.approvedForPublic ? 'Aprovado ✓' : item.publicConsent ? 'Aprovar' : 'Sem autorização'}
        </button>
      </td>
    </tr>
  )
}

export default function TestimonialsPage() {
  const { data = [], isLoading } = useAdminTestimonials()

  const approved = data.filter(t => t.approvedForPublic).length

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin" className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-sage-700">
          <ArrowLeft className="h-4 w-4" /> Voltar ao painel
        </Link>
        <h1 className="text-2xl font-display font-semibold text-neutral-800">Depoimentos</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {data.length} depoimento{data.length !== 1 ? 's' : ''} recebido{data.length !== 1 ? 's' : ''} · {approved} aprovado{approved !== 1 ? 's' : ''} para exibição pública
        </p>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-neutral-100 rounded-xl" />)}
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-neutral-100 bg-white p-10 text-center">
          <p className="text-neutral-500">Nenhum depoimento recebido ainda.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-100 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Nota</th>
                  <th className="px-4 py-3">Texto</th>
                  <th className="px-4 py-3">Psicólogo</th>
                  <th className="px-4 py-3">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {data.map(item => <TestimonialRow key={item.id} item={item} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
