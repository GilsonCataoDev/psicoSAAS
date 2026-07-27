import { useState } from 'react'
import { Search, TrendingUp, MessageSquare, AlertCircle, CheckCircle, Clock, Users } from 'lucide-react'
import { ProspectDetailWithConversations } from '@/components/ProspectDetailWithConversations'

/**
 * Versão melhorada do Radar de Psicólogos com CRM integrado
 */
export function ProspectingPageV2() {
  const [selectedProspect, setSelectedProspect] = useState<any>()
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Mock data - substituir por useQuery real
  const prospects = [
    {
      id: '1',
      name: 'Dr. João Silva',
      city: 'Recife',
      state: 'PE',
      score: 85,
      status: 'qualified',
      source: 'linkedin_search',
      email: 'joao@example.com',
      conversations: 0,
      lastContact: null,
    },
    {
      id: '2',
      name: 'Dra. Maria Santos',
      city: 'Recife',
      state: 'PE',
      score: 72,
      status: 'approved',
      source: 'own_site',
      email: 'maria@example.com',
      conversations: 2,
      lastContact: '2 dias',
    },
    {
      id: '3',
      name: 'Dr. Carlos Oliveira',
      city: 'Olinda',
      state: 'PE',
      score: 65,
      status: 'analyzed',
      source: 'psymeet_search',
      email: 'carlos@example.com',
      conversations: 0,
      lastContact: null,
    },
  ]

  const metrics = {
    total: 45,
    qualified: 12,
    approved: 8,
    contacted: 5,
    interested: 3,
    converted: 1,
  }

  const statusColor: Record<string, string> = {
    discovered: 'bg-neutral-100 text-neutral-700',
    analyzing: 'bg-blue-100 text-blue-700',
    analyzed: 'bg-blue-100 text-blue-700',
    qualified: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    contacted: 'bg-sage-100 text-sage-700',
    interested: 'bg-sage-100 text-sage-700',
    converted: 'bg-emerald-700 text-white',
  }

  const statusLabel: Record<string, string> = {
    discovered: 'Descoberto',
    analyzing: 'Analisando',
    analyzed: 'Analisado',
    qualified: 'Qualificado',
    approved: 'Aprovado',
    contacted: 'Contatado',
    interested: 'Interessado',
    converted: 'Convertido',
  }

  return (
    <div className="space-y-6 p-6 bg-neutral-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">📡 Radar de Psicólogos</h1>
          <p className="text-neutral-600">Descubra e converta leads qualificados</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg font-semibold">
          <TrendingUp className="h-5 w-5" />
          {metrics.converted} Convertidos
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-6 gap-4">
        {[
          { label: 'Total', value: metrics.total, icon: Users, color: 'blue' },
          { label: 'Qualificados', value: metrics.qualified, icon: CheckCircle, color: 'amber' },
          { label: 'Aprovados', value: metrics.approved, icon: AlertCircle, color: 'emerald' },
          { label: 'Contatados', value: metrics.contacted, icon: MessageSquare, color: 'sage' },
          { label: 'Interessados', value: metrics.interested, icon: TrendingUp, color: 'emerald' },
          { label: 'Convertidos', value: metrics.converted, icon: CheckCircle, color: 'emerald' },
        ].map((m) => (
          <div key={m.label} className={`bg-${m.color}-50 border border-${m.color}-200 rounded-lg p-4 text-center`}>
            <m.icon className={`h-5 w-5 text-${m.color}-600 mx-auto mb-2`} />
            <p className={`text-sm text-${m.color}-600 font-medium`}>{m.label}</p>
            <p className={`text-2xl font-bold text-${m.color}-900`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white rounded-lg border border-neutral-200 p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex-1 flex items-center gap-2 bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-200">
            <Search className="h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar por nome, cidade, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-neutral-200 text-sm outline-none focus:border-sage-400"
          >
            <option value="all">Todos os Status</option>
            <option value="qualified">Qualificados</option>
            <option value="approved">Aprovados</option>
            <option value="interested">Interessados</option>
          </select>
        </div>
      </div>

      {/* Lista de Prospects */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600">Local</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600">Score</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600">Conversas</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600">Último Contato</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600">Ação</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((prospect) => (
              <tr key={prospect.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-neutral-900">{prospect.name}</p>
                    <p className="text-xs text-neutral-500">{prospect.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-neutral-600">{prospect.city}, {prospect.state}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-6 bg-gradient-to-r from-red-200 to-emerald-200 rounded-full relative">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-emerald-500 rounded-full"
                        style={{ width: `${prospect.score}%` }}
                      />
                    </div>
                    <span className="font-semibold text-sm">{prospect.score}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor[prospect.status]}`}>
                    {statusLabel[prospect.status]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1 text-sm font-medium text-neutral-600">
                    <MessageSquare className="h-4 w-4" />
                    {prospect.conversations}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-neutral-500">{prospect.lastContact || '—'}</span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => setSelectedProspect(prospect)}
                    className="px-4 py-2 rounded-lg bg-sage-600 text-white text-sm font-medium hover:bg-sage-700 transition"
                  >
                    Gerenciar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalhe com Conversas */}
      {selectedProspect && (
        <ProspectDetailWithConversations
          prospectId={selectedProspect.id}
          prospectName={selectedProspect.name}
          onClose={() => setSelectedProspect(null)}
        />
      )}
    </div>
  )
}
