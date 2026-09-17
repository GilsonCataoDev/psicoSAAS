import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react'
import BrandLogo from '@/components/ui/BrandLogo'
import { LeadCaptureForm } from '@/components/marketing/LeadCaptureForm'
import { usePageSeo } from '@/lib/pageSeo'

const REGISTER_URL =
  '/cadastro?utm_source=landing&utm_medium=organic&utm_campaign=nutricionistas'

const pains = [
  {
    title: 'Anamnese alimentar feita à mão — e você ainda digitando às 22h',
    text: 'Cada consulta gera horas de digitação manual: recordatório alimentar de 24h, diário alimentar, frequência de consumo. Tempo que você deveria usar atendendo mais pacientes.',
  },
  {
    title: 'Plano alimentar em planilha, prontuário em papel, evolução no WhatsApp',
    text: 'Dados espalhados entre Excel, Google Docs, WhatsApp e papel dificultam o acompanhamento, aumentam o risco de erro e comprometem a qualidade do atendimento.',
  },
  {
    title: 'Prontuário sem os campos do CFN — e o risco que isso traz',
    text: 'A CFN 594/2017 exige campos específicos no prontuário nutricional. Usar sistema genérico sem esses campos pode resultar em irregularidade na documentação clínica.',
  },
]

const features = [
  {
    icon: BookOpen,
    title: 'Recordatório alimentar digital',
    text: 'Registre recordatório de 24h, diário alimentar ou questionário de frequência diretamente no prontuário, sem planilhas externas. Histórico de consumo consultado em segundos.',
    accent: 'text-sky-600 bg-sky-50',
  },
  {
    icon: UtensilsCrossed,
    title: 'Plano alimentar integrado ao prontuário',
    text: 'Elabore e registre o plano alimentar com valor energético, distribuição de macronutrientes e orientações, tudo vinculado ao prontuário do paciente e acessível em qualquer consulta.',
    accent: 'text-amber-600 bg-amber-50',
  },
  {
    icon: FileText,
    title: 'Assinatura de documentos',
    text: 'Emita e assine eletronicamente laudos, orientações e planos alimentares. Documentos assinados ficam arquivados no prontuário e podem ser enviados ao paciente.',
    accent: 'text-sage-600 bg-sage-50',
  },
  {
    icon: Calendar,
    title: 'Agenda com encaixes e retornos',
    text: 'Gerencie sua agenda de consultas, retornos e encaixes com confirmação automática. Reduza faltas com lembretes e visualize disponibilidade de forma clara.',
    accent: 'text-teal-600 bg-teal-50',
  },
  {
    icon: TrendingUp,
    title: 'Relatórios de evolução antropométrica',
    text: 'Acompanhe peso, IMC, circunferências e composição corporal em gráficos de evolução. Mostre ao paciente seu progresso de forma visual e motivadora.',
    accent: 'text-green-600 bg-green-50',
  },
  {
    icon: Sparkles,
    title: 'IA que gera rascunho — você revisa e assina',
    text: 'O assistente de IA produz um rascunho de evolução para você revisar, corrigir e assinar. A responsabilidade técnica e a conduta são sempre do nutricionista.',
    accent: 'text-purple-600 bg-purple-50',
  },
]

const cfnItems = [
  {
    norm: 'CFN 594/2017',
    title: 'Campos obrigatórios do prontuário nutricional',
    text: 'A resolução exige identificação do paciente, anamnese alimentar, dados antropométricos, diagnóstico nutricional, plano alimentar e registro de evolução. Todos esses campos estão presentes no UseCognia.',
  },
  {
    norm: 'CFN 599/2018',
    title: 'Responsabilidade técnica conforme CFN 599/2018',
    text: 'A IA do UseCognia gera apenas rascunhos para revisão profissional. O diagnóstico nutricional, o plano alimentar e a conduta são sempre de responsabilidade exclusiva do nutricionista habilitado — conforme o código de ética.',
  },
]

const faq = [
  {
    q: 'O UseCognia atende às exigências do CFN?',
    a: 'Sim. Sim. O prontuário nutricional do UseCognia contempla os campos previstos na CFN 594/2017: identificação completa, anamnese alimentar, avaliação antropométrica, diagnóstico nutricional, plano alimentar e registro de evolução. Baixe o checklist gratuito nesta página para conferir campo a campo.',
  },
  {
    q: 'Posso emitir plano alimentar pelo sistema?',
    a: 'Sim. O UseCognia permite elaborar o plano alimentar diretamente no prontuário, registrando valor energético, distribuição de macronutrientes e orientações. O plano pode ser impresso ou enviado digitalmente ao paciente, com assinatura eletrônica do nutricionista.',
  },
  {
    q: 'Tem versão gratuita para nutricionistas?',
    a: 'Sim. O plano gratuito inclui até 10 pacientes, prontuário nutricional completo, agenda de consultas e acesso às principais funcionalidades — sem cartão de crédito e sem prazo de validade. Para clínicas com mais pacientes, há planos pagos a partir de R$ 49/mês.',
  },
]

export default function NutricionistasPage() {
  usePageSeo({
    title: 'Prontuário nutricional digital — UseCognia',
    description:
      'Prontuário nutricional com recordatório alimentar digital, plano alimentar integrado e conformidade CFN 594/2017. Mais de 500 nutricionistas no UseCognia.',
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
            <a href="#cfn" className="hover:text-sage-700">Conformidade CFN</a>
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
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-5 lg:py-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-sm font-semibold text-sage-200">
              Para nutricionistas
            </p>

            <h1 className="mt-6 text-[1.9rem] font-bold leading-[1.1] tracking-normal text-white sm:text-5xl lg:text-[3rem]">
              Chega de prontuário nutricional no papel. Anamnese alimentar, plano e evolução em um só lugar.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80 sm:text-lg">
              O UseCognia foi feito para nutricionistas: recordatório alimentar digital, plano
              alimentar integrado ao prontuário e conformidade com a CFN 594/2017 — tudo em
              um lugar.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to={REGISTER_URL}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#CFF3DE] px-6 text-sm font-bold text-[#143D2D] shadow-lg shadow-black/15 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Cadastre-se grátis <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/25 px-6 text-sm font-semibold text-white hover:border-white/50"
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

      {/* ── Social proof strip ── */}
      <section className="border-b border-[#E7E4DA] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
              <p className="text-2xl font-bold text-[#211F1C]">+500</p>
              <p className="text-sm text-[#7C776B]">nutricionistas organizam seus atendimentos no UseCognia</p>
            </div>
            <div className="hidden h-10 w-px bg-[#E7E4DA] sm:block" />
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-2xl font-bold text-[#211F1C]">CFN 594/2017</p>
              <p className="text-sm text-[#7C776B]">campos obrigatórios do prontuário nutricional</p>
            </div>
            <div className="hidden h-10 w-px bg-[#E7E4DA] sm:block" />
            <div className="flex flex-col items-center gap-1 text-center sm:items-end sm:text-right">
              <p className="text-2xl font-bold text-[#211F1C]">5 min</p>
              <p className="text-sm text-[#7C776B]">para configurar e começar a atender</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Dores ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">O problema</p>
            <h2 className="mt-3 text-2xl font-bold text-[#211F1C] sm:text-3xl">
              O prontuário genérico não foi feito para o raciocínio clínico da nutrição.
            </h2>
            <p className="mt-4 leading-relaxed text-[#5F5A51]">
              Faltam campos fundamentais que a CFN exige e que o acompanhamento nutricional precisa.
              O resultado é tempo desperdiçado, risco regulatório e dificuldade de demonstrar evolução ao paciente.
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
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">
              Funcionalidades
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#211F1C] sm:text-3xl">
              Do recordatório ao plano alimentar, tudo no mesmo prontuário.
            </h2>
            <p className="mt-4 leading-relaxed text-[#5F5A51]">
              Campos e fluxos pensados para a nutrição clínica, com IA que apoia sem substituir
              o julgamento do profissional.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                conforme a CFN 594/2017 e o CFN 599/2018.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Conformidade regulatória (CFN) ── */}
      <section id="cfn" className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">
            Conformidade regulatória
          </p>
          <h2 className="mt-3 text-2xl font-bold text-[#211F1C] sm:text-3xl">
            Prontuário alinhado às resoluções do CFN.
          </h2>
          <p className="mt-4 leading-relaxed text-[#5F5A51]">
            O UseCognia foi desenhado com base nas resoluções do Conselho Federal de Nutricionistas
            para garantir que sua documentação clínica esteja em conformidade.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {cfnItems.map(({ norm, title, text }) => (
            <article
              key={norm}
              className="rounded-lg border border-[#E7E4DA] bg-[#FFFFFF] p-6 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sage-50 text-sage-700">
                  <Shield className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-sage-700">{norm}</p>
                  <h3 className="mt-1 font-semibold text-[#211F1C]">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#7C776B]">{text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-sage-100 bg-sage-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-[#49443D]">
              <strong>Baixe o checklist gratuito</strong> com todos os campos obrigatórios do
              prontuário nutricional segundo a CFN 594/2017.
            </p>
            <a
              href="#lead"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-sage-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sage-900"
            >
              Baixar checklist <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Depoimento ── */}
      <section className="border-y border-[#E7E4DA] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
          <div className="mx-auto max-w-2xl">
            <div className="flex gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-current" />
              ))}
            </div>
            <blockquote className="mt-5">
              <p className="text-lg font-medium leading-relaxed text-[#211F1C] sm:text-xl">
                "Antes eu perdia quase uma hora por dia digitando recordatório alimentar. Agora faço
                tudo direto no prontuário durante a consulta e ainda tenho os gráficos de evolução
                prontos para mostrar ao paciente. A parte do CFN me deu muita tranquilidade."
              </p>
              <footer className="mt-4">
                <p className="font-semibold text-[#211F1C]">Nutricionista clínica</p>
                <p className="text-sm text-[#7C776B]">Atendimento em consultório particular, São Paulo</p>
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* ── Lead Capture ── */}
      <section id="lead" className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
        <div className="mx-auto max-w-xl">
          <div className="mb-8 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">
              Recurso gratuito
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#211F1C]">
              Receba o checklist gratuito de campos obrigatórios do prontuário nutricional
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#5F5A51]">
              Checklist CFN 594/2017: todos os campos obrigatórios que o prontuário nutricional
              precisa ter para estar em conformidade com a resolução.
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

      {/* ── FAQ ── */}
      <section className="border-y border-[#E7E4DA] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
          <div className="mx-auto max-w-2xl">
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">
                Dúvidas frequentes
              </p>
              <h2 className="mt-3 text-2xl font-bold text-[#211F1C] sm:text-3xl">
                Perguntas de nutricionistas
              </h2>
            </div>
            <div className="mt-10 divide-y divide-[#E7E4DA]">
              {faq.map(({ q, a }) => (
                <details key={q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                    <h3 className="font-semibold text-[#211F1C]">{q}</h3>
                    <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-[#7C776B] transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-[#5F5A51]">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="bg-[#1D352D] px-4 py-20 text-white sm:px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-200">
            Comece grátis
          </p>
          <h2 className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">
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
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-5">
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
