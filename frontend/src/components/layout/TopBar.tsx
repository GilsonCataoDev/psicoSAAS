import { useState } from 'react'
import { Bell, Search, Heart, X, Menu } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export default function TopBar() {
  const user = useAuthStore((s) => s.user)
  const firstName = user?.name?.split(' ')[0] ?? 'Psicólogo(a)'
  const [searchOpen, setSearchOpen] = useState(false)

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

      {/* Notificações */}
      <button className="relative p-2 rounded-xl hover:bg-neutral-100 text-neutral-500 transition-colors">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sage-500 rounded-full" />
      </button>
    </header>
  )
}
