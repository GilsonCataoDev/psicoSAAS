import { useState, useRef, useEffect } from 'react'
import { Bell, Search, X, Check, CheckCheck, Trash2, Calendar, CreditCard, Clock, Settings2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useNotificationStore, AppNotification, NotificationType } from '@/store/notifications'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import BrandLogo from '@/components/ui/BrandLogo'

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  booking_request:   <Calendar  className="w-3.5 h-3.5 text-sage-500"    />,
  booking_confirmed: <Check     className="w-3.5 h-3.5 text-emerald-500" />,
  payment:           <CreditCard className="w-3.5 h-3.5 text-violet-500" />,
  reminder:          <Clock     className="w-3.5 h-3.5 text-amber-500"   />,
  system:            <Settings2 className="w-3.5 h-3.5 text-neutral-400" />,
}

const TYPE_BG: Record<NotificationType, string> = {
  booking_request:   'bg-sage-50',
  booking_confirmed: 'bg-emerald-50',
  payment:           'bg-violet-50',
  reminder:          'bg-amber-50',
  system:            'bg-neutral-100',
}

function timeAgo(iso: string) {
  return formatDistanceToNow(new Date(iso), { locale: ptBR, addSuffix: true })
}

function NotifItem({ n, onRead, onRemove }: {
  n: AppNotification; onRead: () => void; onRemove: () => void
}) {
  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3 hover:bg-neutral-50 cursor-pointer transition-colors group',
        !n.read && 'bg-sage-50/50',
      )}
      onClick={onRead}
    >
      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5', TYPE_BG[n.type])}>
        {TYPE_ICON[n.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-snug', !n.read ? 'font-semibold text-neutral-800' : 'text-neutral-600')}>
          {n.title}
        </p>
        <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{n.body}</p>
        <p className="text-xs text-neutral-300 mt-1">{timeAgo(n.createdAt)}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {!n.read && <span className="w-1.5 h-1.5 bg-sage-500 rounded-full mt-1.5" />}
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-rose-400 text-neutral-300"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

export default function TopBar() {
  const user = useAuthStore(s => s.user)
  const firstName = user?.name?.split(' ')[0] ?? 'Psicólogo(a)'
  const [searchOpen, setSearchOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { notifications, markRead, markAllRead, remove } = useNotificationStore()
  const unread = notifications.filter(n => !n.read).length

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
    <header className="bg-white/85 backdrop-blur-xl border-b border-sage-100/70 px-4 lg:px-6 py-3 flex items-center gap-3 shrink-0 sticky top-0 z-30">

      {/* Logo mobile */}
      <div className="lg:hidden flex items-center gap-2 mr-auto">
        <BrandLogo compact />
        <span className="font-display font-bold text-neutral-900 tracking-tight">UseCognia</span>
      </div>

      {/* Saudação desktop — visível fora do dashboard (o dashboard tem a própria) */}
      <div className="hidden lg:block flex-1">
        <p className="text-sm font-medium text-neutral-600">
          Bem-vindo de volta, <span className="text-sage-700">{firstName}</span>
        </p>
      </div>

      {/* Search */}
      <div className={cn('hidden md:flex relative transition-all duration-200', searchOpen ? 'flex-1 max-w-xs' : 'w-auto')}>
        {!searchOpen ? (
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center w-full relative">
            <Search className="absolute left-3 w-3.5 h-3.5 text-neutral-400" />
            <input
              autoFocus
              type="text"
              placeholder="Buscar pacientes..."
              className="pl-8 pr-8 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-sage-200 focus:border-sage-400 w-full"
              onBlur={() => setSearchOpen(false)}
            />
            <button onClick={() => setSearchOpen(false)} className="absolute right-2 text-neutral-400 hover:text-neutral-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Notificações */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => setPanelOpen(v => !v)}
          className={cn(
            'relative p-2 rounded-xl transition-colors',
            panelOpen ? 'bg-sage-50 text-sage-600' : 'hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600',
          )}
        >
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {panelOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-neutral-100 z-50 overflow-hidden animate-pop">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
              <div>
                <p className="font-semibold text-neutral-800 text-sm">Notificações</p>
                {unread > 0 && <p className="text-xs text-neutral-400">{unread} não lida{unread !== 1 ? 's' : ''}</p>}
              </div>
              {unread > 0 && (
                <button onClick={markAllRead} title="Marcar todas como lidas"
                  className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-sage-600 transition-colors">
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-neutral-50">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-10 h-10 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-5 h-5 text-neutral-300" />
                  </div>
                  <p className="text-sm text-neutral-400">Tudo em dia por aqui 🌿</p>
                </div>
              ) : (
                notifications.map(n => (
                  <NotifItem key={n.id} n={n} onRead={() => handleClickNotif(n)} onRemove={() => remove(n.id)} />
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-neutral-100 flex justify-end">
                <button
                  onClick={() => useNotificationStore.getState().clearAll()}
                  className="flex items-center gap-1 text-xs text-neutral-400 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Limpar tudo
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
