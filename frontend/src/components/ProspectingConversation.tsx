import { useState } from 'react'
import { Send, Check, AlertCircle, MessageSquare, Loader2, Pause, Ban, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  useConversation,
  useCreateDraftMessage,
  useApproveMessage,
  useSendMessage,
  useRecordInbound,
  usePauseConversation,
  useOptOutConversation,
  useConvertConversation,
  type ProspectConversation,
  type ProspectMessage,
} from '@/hooks/api/prospecting-conversations'

interface Props {
  conversationId: string
}

export function ProspectingConversation({ conversationId }: Props) {
  const { data: response, isLoading } = useConversation(conversationId)
  const conversation = response?.data as ProspectConversation | undefined
  const createDraft = useCreateDraftMessage()
  const approveMsg = useApproveMessage()
  const sendMsg = useSendMessage()
  const recordInbound = useRecordInbound()
  const pauseConv = usePauseConversation()
  const optOutConv = useOptOutConversation()
  const convertConv = useConvertConversation()

  const [draftContent, setDraftContent] = useState('')
  const [inboundContent, setInboundContent] = useState('')
  const [showInbound, setShowInbound] = useState(false)

  if (isLoading) return <div className="p-4">Carregando...</div>
  if (!conversation) return <div className="p-4">Conversa nao encontrada</div>

  const handleCreateDraft = async () => {
    if (!draftContent.trim()) {
      toast.error('Escreva algo primeiro')
      return
    }
    createDraft.mutate(
      { conversationId, content: draftContent, aiGenerated: false },
      {
        onSuccess: () => {
          setDraftContent('')
          toast.success('Rascunho criado')
        },
        onError: () => toast.error('Erro ao criar rascunho'),
      },
    )
  }

  const handleApprove = (messageId: string) => {
    approveMsg.mutate(
      { messageId },
      {
        onSuccess: () => toast.success('Mensagem aprovada'),
        onError: () => toast.error('Erro ao aprovar'),
      },
    )
  }

  const handleSend = (messageId: string) => {
    sendMsg.mutate(messageId, {
      onSuccess: () => toast.success('Mensagem enviada'),
      onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erro ao enviar'),
    })
  }

  const handleRecordInbound = async () => {
    if (!inboundContent.trim()) {
      toast.error('Escreva a resposta')
      return
    }
    recordInbound.mutate(
      { conversationId, content: inboundContent },
      {
        onSuccess: () => {
          setInboundContent('')
          setShowInbound(false)
          toast.success('Resposta registrada')
        },
        onError: () => toast.error('Erro ao registrar resposta'),
      },
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4">
        <div>
          <h3 className="font-semibold">{conversation.channel}</h3>
          <p className="text-sm text-neutral-500">Status: {conversation.status}</p>
        </div>
        <div className="flex gap-2">
          {conversation.status === 'active' && (
            <>
              <button
                onClick={() => pauseConv.mutate(conversationId, { onSuccess: () => toast.success('Conversa pausada') })}
                className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50"
              >
                <Pause className="h-4 w-4" />
                Pausar
              </button>
              <button
                onClick={() => optOutConv.mutate(conversationId, { onSuccess: () => toast.success('Prospect opt-out') })}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                <Ban className="h-4 w-4" />
                Nao contatar
              </button>
            </>
          )}
          {conversation.status === 'active' && (
            <button
              onClick={() => convertConv.mutate(conversationId, { onSuccess: () => toast.success('Convertido!') })}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-200"
            >
              <CheckCircle className="h-4 w-4" />
              Convertido
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <h4 className="font-semibold">Timeline</h4>
        {conversation.messages?.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhuma mensagem ainda</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {conversation.messages?.map((msg) => (
              <div key={msg.id} className="flex gap-3 border-l-2 border-neutral-200 pl-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-600">
                      {msg?.direction === 'outbound' ? 'Saida' : 'Entrada'}
                    </span>
                    <span className="text-xs text-neutral-500">{msg?.createdAt && new Date(msg.createdAt).toLocaleString('pt-BR')}</span>
                  </div>
                  <p className="text-sm text-neutral-700 mt-1">{msg.content}</p>
                  <div className="flex gap-2 mt-2">
                    {msg.status === 'draft' && (
                      <>
                        <button
                          onClick={() => handleApprove(msg.id)}
                          disabled={approveMsg.isPending}
                          className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                        >
                          {approveMsg.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Aprovar
                        </button>
                      </>
                    )}
                    {msg.status === 'approved' && (
                      <button
                        onClick={() => handleSend(msg.id)}
                        disabled={sendMsg.isPending}
                        className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 flex items-center gap-1"
                      >
                        {sendMsg.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        Enviar
                      </button>
                    )}
                    <span className="text-xs text-neutral-500">{msg.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Draft */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h4 className="font-semibold mb-3">Novo Rascunho</h4>
        <textarea
          value={draftContent}
          onChange={(e) => setDraftContent(e.target.value)}
          placeholder="Escreva a mensagem..."
          maxLength={5000}
          className="w-full h-24 p-3 border border-neutral-200 rounded-lg text-sm outline-none focus:border-sage-400 resize-none"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-neutral-500">{draftContent.length}/5000</span>
          <button
            onClick={handleCreateDraft}
            disabled={createDraft.isPending || !draftContent.trim()}
            className="px-4 py-2 rounded-lg bg-sage-600 text-white hover:bg-sage-700 disabled:opacity-50 text-sm font-medium"
          >
            {createDraft.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Rascunho'}
          </button>
        </div>
      </div>

      {/* Record Inbound */}
      {!showInbound ? (
        <button
          onClick={() => setShowInbound(true)}
          className="w-full py-3 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 text-sm font-medium flex items-center justify-center gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Registrar Resposta Manual
        </button>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h4 className="font-semibold mb-3">Registrar Resposta</h4>
          <textarea
            value={inboundContent}
            onChange={(e) => setInboundContent(e.target.value)}
            placeholder="Cole a mensagem que prospect respondeu..."
            maxLength={5000}
            className="w-full h-20 p-3 border border-neutral-200 rounded-lg text-sm outline-none focus:border-sage-400 resize-none"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleRecordInbound}
              disabled={recordInbound.isPending}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
            >
              {recordInbound.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Registrar'}
            </button>
            <button
              onClick={() => {
                setShowInbound(false)
                setInboundContent('')
              }}
              className="px-4 py-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
