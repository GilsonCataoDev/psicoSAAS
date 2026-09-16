import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react'
import BrandLogo from '@/components/ui/BrandLogo'
import { LeadCaptureForm } from '@/components/marketing/LeadCaptureForm'
import { usePageSeo } from '@/lib/pageSeo'

const REGISTER_URL =
  '/cadastro?utm_source=landing&utm_medium=organic&utm_campaign=nutricionistas'

const pains = [
  {
    title: 'Prontuário genérico que não tem campo para recordatório alimentar nem diagnóstico nutricional',
    text: 'Sistemas criados para medicina não contemplam anamnese alimentar, inquérito de consumo, avaliação antropométrica nem o diagnóstico nutricional como ato privativo do nutricionista.',
  },
  {
    title: 'IA que "prescreve dieta" sem deixar claro que a conduta é do nutricionista',
    text: 'Ferramentas de IA mal configuradas sugerem condutas alimentares como se fossem prescrição automática, comprometendo a responsabilidade técnica do profissional.',
  },
  {
    title: 'Dados de avaliação antropométrica e conduta espalhados em planilhas diferentes',
    text: 'Peso, altura, IMC, diagnóstico e plano alimentar em arquivos separados dificultam o acompanhamento da evolução do paciente e aumentam o risco de erro.',
  },
]

const features = [
  {
    icon: BookOpen,
    title: 'Anamnese alimentar com inquérito de consumo integrado',
    text: 'Registre recordatório alimentar de 24h, diário alimentar ou questionário de frequência diretamente no prontuário, sem planilhas externas.',
    accent: 'text-sky-600 bg-sky-50',
  },
  {
    icon: ClipboardList,
    title: 'Diagnóstico nutricional separado do médico — ato privativo registrado corretamente',
    text: 'Campo específico para o diagnóstico nutricional conforme CFN 599, distinto do diagnóstico médico, garantindo a correta atribuição do ato profissional.',
    accent: 'text-sage-600 bg-sage-50',
  },
  {
    icon: UtensilsCrossed,
    title: 'Plano alimentar e conduta documentados com data, valor energético e distribuição',
    text: 'Registre a conduta nutricional com data, valor calórico, distribuição de macronutrientes e orientações, tudo no prontuário do paciente.',
    accent: 'text-amber-600 bg-amber-50',
  },
  {
    icon: Sparkles,
    title: 'IA que gera rascunho — você revisa e assina. Conduta é sempre sua.',
    text: 'O assistente de IA produz um rascunho de evolução para você revisar, corrigir e assinar. A responsabilidade técnica e a conduta são sempre do nutricionista.',
    accent: 'text-purple-600 bg-purple-50',
  },
]

export default function NutricionistasPage() {
  usePageSeo({
    title: 'Prontuário nutricional digital — UseCognia',
    description:
      'Prontuário nutricional com anamnese alimentar, diagnóstico nutricional e plano alimentar em um fluxo. Conforme CFN 599.',
    canonicalPath: '/nutricionistas',
  })

  useEffect(() => {
    const html = document.documentElement
    const wasDark = html.classList.contains('dark')
    html.classList.remove('dark')
    return () => {
      if (wasDark) html.classList.add('dark')
    }
  }, [])

  return (
    <main className="landing-readable min-h-screen overflow-x-hidden bg-[#F7F8F5] pb-16 text-[#211F1C] sm:pb-0">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-[#E7E4DA] bg-[#F7F8F5]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
          <Link to="/inicio" className="flex min-w-0 items-center gap-2.5">
            <BrandLogo compact className="shrink-0" />
            <span className="text-xl font-bold tracking-tight text-[#211F1C]">
              Use<span className="text-[#2F7657]">Cognia</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#5F5A51] md:flex">
            <a href="#features" className="hover:text-sage-700">Funcionalidades</a>
            <a href="#lead" className="hover:text-sage-700">Checklist grátis</a>
            <Link to="/blog" className="hover:text-sage-700">Blog</Link>
            <Link to="/precos" className="hover:text-sage-700">Planos</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden px-3 py-2 text-sm font-semibold text-[#49443D] hover:text-sage-700 sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              to={REGISTER_URL}
              className="hidden rounded-md bg-sage-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sage-900 sm:inline-flex"
            >
              Cadastre-se grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#1D352D] text-white">
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-sm font-semibold text-sage-200">
              Para nutricionistas
            </p>

            <h1 className="mt-6 text-[2.1rem] font-bold leading-[1.06] tracking-normal text-white sm:text-5xl lg:text-[3rem]">
              Prontuário nutricional organizado do recordatório à conduta
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80 sm:text-lg">
              Campos específicos para nutrição: anamnese alimentar, diagnóstico nutricional e plano alimentar em um fluxo.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to={REGISTER_URL}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#CFF3DE] px-6 text-sm font-bold text-[#143D2D] shadow-lg shadow-black/15 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Cadastre-se grátis <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/25 px-6 text-sm font-semibold text-white hover:border-white/50 hover:text-white"
              >
                Ver como funciona <ChevronRight className="h-4 w-4" />
              </a>
            </div>
            <p className="mt-3 text-sm text-white/40">
              Até 10 pacientes grátis · sem cartão de crédito
            </p>
          </div>
        </div>
      </section>

      {/* ── Dores ── */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">O problema</p>
            <h2 className="mt-3 text-3xl font-bold text-[#211F1C]">
              Nenhum campo de anamnese alimentar, nenhum diagnóstico nutricional — só campos de médico.
            </h2>
            <p className="mt-4 leading-relaxed text-[#5F5A51]">
              O prontuário genérico não foi feito para o raciocínio clínico da nutrição. Faltam
              campos fundamentais que a CFN exige e que o acompanhamento nutricional precisa.
            </p>
          </div>
          <div className="grid gap-3">
            {pains.map((item) => (
              <article
                key={item.title}
                className="rounded-lg border border-[#E7E4DA] bg-[#FFFFFF] p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <h3 className="font-semibold text-[#211F1C]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#7C776B]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="border-y border-[#E7E4DA] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">
              Funcionalidades
            </p>
            <h2 className="mt-3 text-3xl font-bold text-[#211F1C]">
              Do recordatório ao plano alimentar, tudo no mesmo prontuário.
            </h2>
            <p className="mt-4 leading-relaxed text-[#5F5A51]">
              Campos e fluxos pensados para a nutrição clínica, com IA que apoia sem substituir o
              julgamento do profissional.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, text, accent }) => (
              <article
                key={title}
                className="rounded-lg border border-[#E7E4DA] bg-[#F7F8F5] p-5 transition-shadow hover:shadow-md"
              >
                <span
                  className={`mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold text-[#211F1C]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#7C776B]">{text}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-lg border border-amber-100 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm leading-relaxed text-[#49443D]">
                <strong>Responsabilidade técnica:</strong> a IA do UseCognia gera rascunhos para
                revisão do profissional. A conduta nutricional, o plano alimentar e a prescrição
                de suplementos são sempre de responsabilidade exclusiva do nutricionista habilitado,
                conforme a CFN e o CFN 599.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Lead Capture ── */}
      <section id="lead" className="mx-auto max-w-6xl px-5 py-16">
        <div className="mx-auto max-w-xl">
          <div className="mb-8 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">
              Recurso gratuito
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#211F1C]">
              Receba o checklist gratuito de campos obrigatórios do prontuário nutricional
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#5F5A51]">
              Checklist CFN 594: todos os campos obrigatórios que o prontuário nutricional precisa
              ter para estar em conformidade com a resolução.
            </p>
          </div>
          <LeadCaptureForm
            source="landing-nutricionistas"
            defaultProfession="nutricao"
            title="Quero o checklist CFN 594"
            ctaLabel="Enviar checklist por e-mail"
          />
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="bg-[#1D352D] px-5 py-20 text-white">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-200">
            Comece grátis
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-snug">
            Comece grátis agora — até 10 pacientes, sem cartão de crédito
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/80">
            Prontuário nutricional, anamnese alimentar e plano alimentar em um só lugar.
            Configure sua clínica em menos de 5 minutos.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              to={REGISTER_URL}
              className="inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-md bg-[#CFF3DE] px-6 text-sm font-bold text-[#143D2D] shadow-lg hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Criar minha conta grátis <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-sm text-white/75">
              Até 10 pacientes · sem cartão de crédito · sem fidelidade
            </p>
            <div className="mt-2 flex justify-center gap-4 text-sm text-white/60">
              <Link to="/privacidade" className="hover:text-white">Privacidade</Link>
              <Link to="/termos" className="hover:text-white">Termos</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E7E4DA] bg-[#F7F8F5]">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="col-span-full lg:col-span-1">
              <Link to="/inicio" className="flex items-center gap-2.5">
                <BrandLogo compact className="shrink-0" />
                <span className="text-xl font-bold tracking-tight text-[#211F1C]">
                  Use<span className="text-[#2F7657]">Cognia</span>
                </span>
              </Link>
              <p className="mt-3 text-sm leading-relaxed text-[#7C776B]">
                Agenda, registros e cobranças para profissionais de saúde.
              </p>
              <a
                href="mailto:usecognia@gmail.com"
                className="mt-3 block text-sm text-sage-700 hover:underline"
              >
                usecognia@gmail.com
              </a>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#7C776B]">Produto</p>
              <ul className="space-y-2.5 text-sm text-[#49443D]">
                <li><a href="#features" className="hover:text-sage-700">Funcionalidades</a></li>
                <li><Link to="/precos" className="hover:text-sage-700">Planos pagos</Link></li>
                <li><Link to="/seguranca" className="hover:text-sage-700">Segurança</Link></li>
                <li><Link to="/blog" className="hover:text-sage-700">Blog</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#7C776B]">Conta</p>
              <ul className="space-y-2.5 text-sm text-[#49443D]">
                <li><Link to={REGISTER_URL} className="hover:text-sage-700">Criar conta</Link></li>
                <li><Link to="/login" className="hover:text-sage-700">Entrar</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#7C776B]">Legal</p>
              <ul className="space-y-2.5 text-sm text-[#49443D]">
                <li><Link to="/privacidade" className="hover:text-sage-700">Privacidade</Link></li>
                <li><Link to="/termos" className="hover:text-sage-700">Termos de uso</Link></li>
                <li><Link to="/acessibilidade" className="hover:text-sage-700">Acessibilidade</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-[#E7E4DA] pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#A9A394]">© {new Date().getFullYear()} UseCognia. Todos os direitos reservados.</p>
            <p className="text-xs text-[#A9A394]">Feito para profissionais de saúde autônomos no Brasil.</p>
          </div>
        </div>
      </footer>

      {/* ── Mobile sticky CTA ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#D9D5C9] bg-white/95 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden">
        <Link
          to={REGISTER_URL}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-sage-800 text-sm font-bold text-white"
        >
          Cadastre-se grátis <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  )
}
