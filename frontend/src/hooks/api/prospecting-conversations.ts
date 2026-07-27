import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type ConversationChannel = 'whatsapp' | 'email' | 'instagram' | 'manual'
export type ConversationStatus = 'draft' | 'awaiting_approval' | 'approved' | 'active' | 'paused' | 'converted' | 'opted_out' | 'closed'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageStatus = 'draft' | 'awaiting_approval' | 'approved' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'canceled'

export interface ProspectConversation {
  id: string
  prospectId: string
  channel: ConversationChannel
  status: ConversationStatus
  assignedUserId: string | null
  lastInboundAt: string | null
  lastOutboundAt: string | null
  nextFollowUpAt: string | null
  followUpCount: number
  createdAt: string
  updatedAt: string
  messages?: ProspectMessage[]
}

export interface ProspectMessage {
  id: string
  conversationId: string
  direction: MessageDirection
  status: MessageStatus
  content: string
  aiGenerated: boolean
  approvedByUserId: string | null
  approvedAt: string | null
  providerMessageId: string | null
  errorMessage: string | null
  sentAt: string | null
  deliveredAt: string | null
  createdAt: string
}

// Hooks

export const useProspectConversations = (prospectId: string) =>
  useQuery({
    queryKey: ['prospecting', 'conversations', prospectId],
    queryFn: () => api.get(`/admin/prospecting/prospects/${prospectId}/conversations`),
    enabled: !!prospectId,
  })

export const useConversation = (conversationId: string) =>
  useQuery({
    queryKey: ['prospecting', 'conversation', conversationId],
    queryFn: () => api.get(`/admin/prospecting/conversations/${conversationId}`),
    enabled: !!conversationId,
  })

export const useCreateConversation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ prospectId, channel }: { prospectId: string; channel: ConversationChannel }) =>
      api.post(`/admin/prospecting/prospects/${prospectId}/conversations`, { channel }),
    onSuccess: (_, { prospectId }) => {
      qc.invalidateQueries({ queryKey: ['prospecting', 'conversations', prospectId] })
    },
  })
}

export const useCreateDraftMessage = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, content, aiGenerated }: { conversationId: string; content: string; aiGenerated?: boolean }) =>
      api.post(`/admin/prospecting/conversations/${conversationId}/draft`, { content, aiGenerated }),
    onSuccess: (_, { conversationId }) => {
      qc.invalidateQueries({ queryKey: ['prospecting', 'conversation', conversationId] })
    },
  })
}

export const useApproveMessage = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ messageId, notes }: { messageId: string; notes?: string }) =>
      api.post(`/admin/prospecting/messages/${messageId}/approve`, { notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prospecting'] })
    },
  })
}

export const useSendMessage = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string) =>
      api.post(`/admin/prospecting/messages/${messageId}/send`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prospecting'] })
    },
  })
}

export const useRecordInbound = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, content, providerMessageId }: { conversationId: string; content: string; providerMessageId?: string }) =>
      api.post(`/admin/prospecting/conversations/${conversationId}/inbound`, { content, providerMessageId }),
    onSuccess: (_, { conversationId }) => {
      qc.invalidateQueries({ queryKey: ['prospecting', 'conversation', conversationId] })
    },
  })
}

export const usePauseConversation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string) =>
      api.post(`/admin/prospecting/conversations/${conversationId}/pause`, {}),
    onSuccess: (_, conversationId) => {
      qc.invalidateQueries({ queryKey: ['prospecting', 'conversation', conversationId] })
    },
  })
}

export const useOptOutConversation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string) =>
      api.post(`/admin/prospecting/conversations/${conversationId}/opt-out`, {}),
    onSuccess: (_, conversationId) => {
      qc.invalidateQueries({ queryKey: ['prospecting', 'conversation', conversationId] })
    },
  })
}

export const useConvertConversation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string) =>
      api.post(`/admin/prospecting/conversations/${conversationId}/convert`, {}),
    onSuccess: (_, conversationId) => {
      qc.invalidateQueries({ queryKey: ['prospecting', 'conversation', conversationId] })
    },
  })
}
