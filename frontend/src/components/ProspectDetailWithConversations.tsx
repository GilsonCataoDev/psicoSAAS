import { useState } from 'react'
import { X } from 'lucide-react'
import { ProspectConversationsList } from './ProspectConversationsList'
import { ProspectingConversation } from './ProspectingConversation'

interface Props {
  prospectId: string
  prospectName: string
  onClose: () => void
}

/**
 * Exemplo de como integrar o CRM conversacional no detalhe do prospect.
 * Coloque isso em um modal ou painel lateral no ProspectingPage.tsx
 */
export function ProspectDetailWithConversations({ prospectId, prospectName, onClose }: Props) {
  const [selectedConversationId, setSelectedConversationId] = useState<string>()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">{prospectName}</h2>
            <p className="text-sm text-neutral-500">Gerenciar conversas</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
          {/* List */}
          <div className="md:col-span-1">
            <ProspectConversationsList
              prospectId={prospectId}
              selectedConversationId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
            />
          </div>

          {/* Detail */}
          <div className="md:col-span-2">
            {selectedConversationId ? (
              <ProspectingConversation conversationId={selectedConversationId} />
            ) : (
              <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
                <p className="text-neutral-500">Selecione uma conversa ou crie uma nova</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
