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
  createdAt: string
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

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],

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
    {
      name: 'psicosaas-notifications',
      version: 2,
      migrate: () => ({ notifications: [] }),
    },
  ),
)
