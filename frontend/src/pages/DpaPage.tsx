import { Link } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'

export default function DpaPage() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-sage-100 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Link to="/plataforma"><BrandLogo className="h-10 w-auto" /></Link>
          <Link to="/seguranca" className="text-sm font-semibold text-sage-700 hover:text-sage-900">Seguranca</Link>
        </div>
      </header>

      <article className="mx-auto min-h-[520px] max-w-4xl px-5 py-10">
        <p className="text-sm font-medium text-sage-700">UseCognia</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-neutral-950">Acordo de Tratamento de Dados</h1>
      </article>
    </main>
  )
}
