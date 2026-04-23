import { useState, useRef, useEffect } from 'react'
import { Bell, Search, Heart, X, Check, CheckCheck, Trash2, Calendar, CreditCard, Clock, Settings2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useNotificationStore, AppNotification, NotificationType } from '@/store/notifications'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  booking_request: <Calendar className="w-4 h-4 text-sage-500" />,
  booking_confirmed: <Check className="w-4 h-4 text-emerald-500" />,
  payment: <CreditCard className="w-4 h-4 text-violet-500" />,
  reminder: <Clock className="w-4 h-4 text-amber-500" />,
  system: <Settings2 className="w-4 h-4 text-neutral-400" />,
}

const TYPE_BG: Record<NotificationType, string> = {
  booking_request: 'bg-sage-50',
  booking_confirmed: 'bg-emerald-50',
  payment: 'bg-violet-50',
  reminder: 'bg-amber-50',
  system: 'bg-neutral-100',
}

function timeAgo(iso: string) {
  return formatDistanceToNow(new Date(iso), { locale: ptBR, addSuffix: true })
}

function NotifItem({ n, onRead, onRemove }: {
  n: AppNotification
  onRead: () => void
  onRemove: () => void
}) {
  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3 hover:bg-neutral-50 cursor-pointer transition-colors group',
        !n.read && 'bg-sage-50/40',
      )}
      onClick={onRead}
    >
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5', TYPE_BG[n.type])}>
        {TYPE_ICON[n.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-snug', !n.read ? 'font-medium text-neutral-800' : 'text-neutral-600')}>
          {n.title}
        </p>
        <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{n.body}</p>
        <p className="text-xs text-neutral-300 mt-1">{timeAgo(n.createdAt)}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {!n.read && <span className="w-2 h-2 bg-sage-500 rounded-full mt-1" />}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-rose-400 text-neutral-300"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

export default function TopBar() {
  const user = useAuthStore((s) => s.user)
  const firstName = user?.name?.split(' ')[0] ?? 'Psicólogo(a)'
  const [searchOpen, setSearchOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { notifications, markRead, markAllRead, remove } = useNotificationStore()
  const unread = notifications.filter((n) => !n.read).length

  // Fecha o painel ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleClickNotif(n: AppNotification) {
    markRead(n.id)
    setPanelOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <header className="bg-white border-b border-neutral-100 px-4 lg:px-6 py-3 flex items-center gap-3 shrink-0">
      {/* Logo mobile */}
      <div className="lg:hidden flex items-center gap-2 mr-auto">
        <div className="w-7 h-7 bg-sage-500 rounded-lg flex items-center justify-center">
          <Heart className="w-3.5 h-3.5 text-white" fill="white" />
        </div>
        <span className="font-display font-medium text-neutral-800">
          Psico<span className="text-sage-500">SaaS</span>
        </span>
      </div>

      {/* Saudação — desktop */}
      <div className="hidden lg:block flex-1">
        <p className="text-neutral-800 font-medium">
          {greeting()}, {firstName} 👋
        </p>
        <p className="text-xs text-neutral-400 capitalize">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* Search expandível */}
      <div className={cn(
        'hidden md:flex relative transition-all duration-300',
        searchOpen ? 'flex-1 max-w-sm' : 'w-auto',
      )}>
        {!searchOpen && (
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-500 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        )}
        {searchOpen && (
          <div className="flex items-center w-full">
            <Search className="absolute left-3 w-4 h-4 text-neutral-400" />
            <input
              autoFocus
              type="text"
              placeholder="Buscar pessoas..."
              className="pl-9 pr-9 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-sage-300 w-full"
              onBlur={() => setSearchOpen(false)}
            />
            <button
              onClick={() => setSearchOpen(false)}
              className="absolute right-2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Notificações ─────────────────────────────────────────── */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className={cn(
            'relative p-2 rounded-xl transition-colors',
            panelOpen ? 'bg-sage-50 text-sage-600' : 'hover:bg-neutral-100 text-neutral-500',
          )}
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* Painel */}
        {panelOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-neutral-100 z-50 overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
              <div>
                <p className="font-medium text-neutral-800 text-sm">Notificações</p>
                {unread > 0 && (
                  <p className="text-xs text-neutral-400">{unread} não lida{unread !== 1 ? 's' : ''}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    title="Marcar todas como lidas"
                    className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-sage-600 transition-colors"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Lista */}
            <div className="max-h-[420px] overflow-y-auto divide-y divide-neutral-50">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-8 h-8 text-neutral-200 mx-auto mb-2" />
                  <p className="text-sm text-neutral-400">Sem notificações</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <NotifItem
                    key={n.id}
                    n={n}
                    onRead={() => handleClickNotif(n)}
                    onRemove={() => remove(n.id)}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-neutral-100 flex justify-end">
                <button
                  onClick={() => useNotificationStore.getState().clearAll()}
                  className="flex items-center gap-1 text-xs text-neutral-400 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Limpar tudo
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
