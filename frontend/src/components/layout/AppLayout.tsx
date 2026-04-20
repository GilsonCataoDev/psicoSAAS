import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import PWAInstallBanner from '@/components/ui/PWAInstallBanner'

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      {/* Sidebar — visível apenas em lg+ */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6 animate-fade-in">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom Nav — visível apenas em mobile/tablet */}
      <BottomNav />
      <PWAInstallBanner />
    </div>
  )
}
