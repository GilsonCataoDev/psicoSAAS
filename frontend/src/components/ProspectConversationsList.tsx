import { MessageCircle, Plus, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  useProspectConversations,
  useCreateConversation,
  type ConversationChannel,
} from '@/hooks/api/prospecting-conversations'

interface Props {
  prospectId: string
  onSelectConversation: (conversationId: string) => void
  selectedConversationId?: string
}

const CHANNELS: { value: ConversationChannel; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'instagram', label: 'Instagram' },
]

const STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho',
  awaiting_approval: 'Aguardando aprovacao',
  approved: 'Aprovada',
  active: 'Ativa',
  paused: 'Pausada',
  converted: 'Convertida',
  opted_out: 'Nao contatar',
  closed: 'Fechada',
}

export function ProspectConversationsList({ prospectId, onSelectConversation, selectedConversationId }: Props) {
  const { data: response, isLoading } = useProspectConversations(prospectId)
  const conversations = response?.data as any[] | undefined
  const createConv = useCreateConversation()

  const handleCreateConversation = (channel: ConversationChannel) => {
    createConv.mutate(
      { prospectId, channel },
      {
        onSuccess: (data: any) => {
          toast.success(`Conversa ${channel} criada`)
          onSelectConversation(data?.data?.id)
        },
        onError: () => toast.error('Erro ao criar conversa'),
      },
    )
  }

  if (isLoading) return <div className="p-4 text-sm text-neutral-600">Carregando conversas...</div>

  return (
    <div className="space-y-3">
      {/* Create New */}
      <div className="rounded-lg border border-neutral-200 bg-white p-3">
        <p className="text-xs font-semibold text-neutral-600 mb-2">Nova Conversa</p>
        <div className="grid grid-cols-2 gap-2">
          {CHANNELS.map((ch) => (
            <button
              key={ch.value}
              onClick={() => handleCreateConversation(ch.value)}
              disabled={createConv.isPending}
              className="px-3 py-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {createConv.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              {ch.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {conversations?.length === 0 ? (
          <p className="text-xs text-neutral-500 text-center py-4">Nenhuma conversa. Crie uma acima.</p>
        ) : (
          conversations?.map((conv: any) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`w-full text-left px-3 py-3 rounded-lg border transition-all ${
                selectedConversationId === conv.id
                  ? 'border-sage-400 bg-sage-50'
                  : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-neutral-600 flex-shrink-0" />
                    <span className="text-xs font-semibold text-neutral-900">{conv.channel}</span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Status: <span className="font-medium">{STATUS_LABEL[conv.status] ?? conv.status}</span>
                  </p>
                  {conv.lastInboundAt && (
                    <p className="text-xs text-neutral-500 mt-0.5">Ultima resposta: {new Date(conv.lastInboundAt).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
                {conv.messages?.length > 0 && (
                  <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded font-medium flex-shrink-0">
                    {conv.messages.length}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
