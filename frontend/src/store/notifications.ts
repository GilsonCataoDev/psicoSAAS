import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NotificationType =
  | 'booking_request'
  | 'booking_confirmed'
  | 'payment'
  | 'reminder'
  | 'system'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  createdAt: string   // ISO string (serializável no localStorage)
  link?: string
}

interface NotificationState {
  notifications: AppNotification[]
  addNotification: (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  remove: (id: string) => void
  clearAll: () => void
}

// ─── Dados mock de boas-vindas ──────────────────────────────────────────────
const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    type: 'booking_request',
    title: 'Nova solicitação de agendamento',
    body: 'Ana Silva pediu uma sessão para 25/04 às 14h. Confirme ou recuse.',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    link: '/agendamentos',
  },
  {
    id: 'n2',
    type: 'payment',
    title: 'Pagamento recebido',
    body: 'Mariana Costa confirmou o pagamento de R$ 180,00 via PIX. ✅',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    link: '/financeiro',
  },
  {
    id: 'n3',
    type: 'reminder',
    title: 'Sessão em 1 hora',
    body: 'Você tem sessão com Pedro Alves às 15h hoje. Boa sessão! 💙',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    link: '/agenda',
  },
  {
    id: 'n4',
    type: 'booking_confirmed',
    title: 'Sessão confirmada',
    body: 'Laura Ferreira confirmou presença para 26/04 às 10h.',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    link: '/agenda',
  },
  {
    id: 'n5',
    type: 'system',
    title: 'Bem-vinda ao PsicoSaaS! 🌱',
    body: 'Seu período de teste gratuito está ativo. Explore todas as funcionalidades por 14 dias.',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    link: '/planos',
  },
]

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: MOCK_NOTIFICATIONS,

      addNotification: (n) =>
        set((state) => ({
          notifications: [
            {
              ...n,
              id: `n${Date.now()}`,
              read: false,
              createdAt: new Date().toISOString(),
            },
            ...state.notifications,
          ],
        })),

      markRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        })),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      remove: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearAll: () => set({ notifications: [] }),
    }),
    { name: 'psicosaas-notifications' },
  ),
)
