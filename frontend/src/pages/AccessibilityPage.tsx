import { Link } from 'react-router-dom'
import { CheckCircle2, ExternalLink, Eye, Keyboard, MousePointer2, ShieldCheck } from 'lucide-react'
import BrandLogo from '@/components/ui/BrandLogo'

const resources = [
  {
    title: 'Atalhos de navegação',
    description: 'Links de salto para conteúdo, menu e busca nas áreas autenticadas.',
    icon: Keyboard,
  },
  {
    title: 'Foco visível',
    description: 'Elementos interativos possuem destaque visual ao navegar por teclado.',
    icon: MousePointer2,
  },
  {
    title: 'Contraste e tema',
    description: 'Interface com modo claro/escuro e revisão contínua de contraste.',
    icon: Eye,
  },
  {
    title: 'Textos auxiliares',
    description: 'Uso progressivo de aria-labels, alt em imagens relevantes e alertas semânticos.',
    icon: CheckCircle2,
  },
]

export default function AccessibilityPage() {
  return (
    <main id="main-content" className="min-h-screen bg-neutral-50 px-4 py-8 text-neutral-800">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <BrandLogo />
          <Link
            to="/plataforma"
            className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-white"
          >
            Voltar
          </Link>
        </div>

        <section className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-sage-50">
            <ShieldCheck className="h-5 w-5 text-sage-700" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Acessibilidade
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            O UseCognia adota melhorias progressivas de acessibilidade digital alinhadas ao eMAG
            e às boas práticas WCAG. Esta página registra os recursos disponíveis e os pontos que
            ainda exigem auditoria formal.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {resources.map(({ title, description, icon: Icon }) => (
              <article key={title} className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
                <Icon className="mb-3 h-5 w-5 text-sage-700" />
                <h2 className="text-sm font-semibold text-neutral-800">{title}</h2>
                <p className="mt-1 text-sm leading-5 text-neutral-500">{description}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <p className="font-semibold">Status atual</p>
            <p className="mt-1">
              Conformidade em evolução. O sistema ainda precisa de auditoria completa com leitor
              de tela, navegação por teclado em todos os fluxos e validação automatizada por página.
            </p>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-neutral-800">Referências usadas</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="https://www.gov.br/governodigital/pt-br/acessibilidade-e-usuario/acessibilidade-digital/modelo-de-acessibilidade"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
              >
                Modelo eMAG
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://emag.governoeletronico.gov.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
              >
                eMAG Governo Eletrônico
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
