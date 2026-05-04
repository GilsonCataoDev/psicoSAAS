import { Link } from 'react-router-dom'
import { CalendarDays, FileText, ShieldCheck, Wallet, MessageSquare, ArrowRight, CheckCircle2 } from 'lucide-react'
import BrandLogo from '@/components/ui/BrandLogo'

const features = [
  { icon: CalendarDays, title: 'Agenda clara', text: 'Consultas, horarios ocupados e link publico no mesmo fluxo.' },
  { icon: FileText, title: 'Prontuario e documentos', text: 'Registros clinicos, PDFs e verificacao de autenticidade.' },
  { icon: Wallet, title: 'Financeiro organizado', text: 'Entradas, pendencias, links de pagamento e indicadores.' },
  { icon: MessageSquare, title: 'Comunicacao Pro', text: 'Mensagens prontas e automacoes para reduzir trabalho manual.' },
]

const proItems = [
  'Pacientes e documentos ilimitados',
  'Cobrancas por link e cartao via Asaas',
  'Modelos de mensagens personalizados',
  'Lembretes e cobrancas automaticas',
  'Relatorios para acompanhar desempenho',
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <header className="sticky top-0 z-20 border-b border-sage-100/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <BrandLogo className="h-10 w-auto" />
          <nav className="hidden items-center gap-6 text-sm text-neutral-500 md:flex">
            <a href="#produto" className="hover:text-sage-700">Produto</a>
            <a href="#pro" className="hover:text-sage-700">Plano Pro</a>
            <Link to="/privacidade" className="hover:text-sage-700">LGPD</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden rounded-xl px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-sage-50 sm:inline-flex">
              Entrar
            </Link>
            <Link to="/cadastro" className="btn-primary text-sm">
              Comecar
            </Link>
          </div>
        </div>
      </header>

      <section className="cognia-surface">
        <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl grid-cols-1 items-center gap-10 px-5 py-12 lg:grid-cols-[1fr_0.9fr]">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex rounded-full border border-sage-100 bg-white px-3 py-1 text-sm font-medium text-sage-700 shadow-sm">
              SaaS para psicologos e clinicas de saude mental
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight text-neutral-950 sm:text-5xl">
              Gestao inteligente para profissionais da mente.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-neutral-600">
              A UseCognia organiza agenda, pacientes, prontuarios, financeiro e comunicacao em uma interface moderna, segura e pronta para assinatura.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/cadastro" className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3">
                Testar 7 dias gratis <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/privacidade" className="inline-flex items-center justify-center gap-2 rounded-xl border border-sage-100 bg-white px-5 py-3 text-sm font-medium text-sage-700 shadow-sm hover:bg-sage-50">
                <ShieldCheck className="h-4 w-4" /> Ver privacidade
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-sage-100 bg-white p-4 shadow-lifted">
            <div className="rounded-xl bg-sage-50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-neutral-800">Hoje</p>
                  <p className="text-xs text-neutral-500">4 consultas, 2 pendencias</p>
                </div>
                <span className="rounded-full bg-mist-100 px-3 py-1 text-xs font-medium text-mist-700">Pro</span>
              </div>
              <div className="space-y-3">
                {['09:00 - Ana Paula', '10:00 - Pedro Lima', '14:00 - Marina Costa'].map((item) => (
                  <div key={item} className="rounded-xl border border-sage-100 bg-white px-4 py-3 text-sm font-medium text-neutral-700 shadow-sm">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="produto" className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-4 md:grid-cols-4">
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-sage-100 bg-white p-5 shadow-card">
              <Icon className="mb-4 h-5 w-5 text-sage-600" />
              <h2 className="font-semibold text-neutral-900">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pro" className="bg-neutral-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 lg:grid-cols-[0.9fr_1fr]">
          <div>
            <p className="text-sm font-semibold text-sage-700">Plano Pro</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-neutral-950">Para vender mais tempo, nao mais trabalho.</h2>
            <p className="mt-4 text-neutral-600">
              O Pro e o plano para psicologos que ja atendem com frequencia e querem automatizar cobrancas, mensagens e organizacao financeira.
            </p>
          </div>
          <div className="rounded-2xl border border-sage-100 bg-white p-6 shadow-card">
            <ul className="space-y-3">
              {proItems.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-neutral-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/cadastro" className="btn-primary mt-6 inline-flex w-full justify-center py-3">
              Comecar no Pro
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
