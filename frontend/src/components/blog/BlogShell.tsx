import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import BrandLogo from '@/components/ui/BrandLogo'

export default function BlogShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#211F1C] dark:bg-[#101713] dark:text-[#F5F5F4]">
      <header className="sticky top-0 z-30 border-b border-[#E1E6DE] bg-[#F7F8F5]/95 backdrop-blur dark:border-white/10 dark:bg-[#101713]/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Link to="/" aria-label="Página inicial do UseCognia"><BrandLogo /></Link>
          <nav className="flex items-center gap-3 text-sm font-semibold sm:gap-5" aria-label="Navegação do blog">
            <Link to="/blog" className="text-sage-800 hover:text-sage-600 dark:text-sage-200 dark:hover:text-white">Conteúdos</Link>
            <Link to="/plataforma" className="hidden text-[#5F5A51] hover:text-sage-700 dark:text-neutral-300 dark:hover:text-sage-200 sm:inline">Conhecer a plataforma</Link>
            <Link to="/cadastro" className="inline-flex items-center gap-1.5 rounded-md bg-sage-800 px-3.5 py-2.5 text-white hover:bg-sage-900">Testar grátis <ArrowRight className="h-4 w-4" /></Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-[#E1E6DE] bg-white dark:border-white/10 dark:bg-[#101713]">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div><BrandLogo /><p className="mt-2 text-sm text-[#5F5A51] dark:text-neutral-300">Conteúdo para uma rotina clínica mais organizada.</p></div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#5F5A51] dark:text-neutral-300">
            <Link to="/seguranca" className="hover:text-sage-700">Segurança</Link>
            <Link to="/privacidade" className="hover:text-sage-700">Privacidade</Link>
            <Link to="/termos" className="hover:text-sage-700">Termos</Link>
            <a href="mailto:usecognia@gmail.com" className="hover:text-sage-700">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
