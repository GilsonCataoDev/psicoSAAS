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
    title: 'Anamnese e recordatório alimentar completos',
    text: 'Anamnese alimentar, recordatório de 24h, diário alimentar e questionário de frequência de consumo — tudo no prontuário, sem planilha externa. Diagnóstico nutricional vinculado ao histórico do paciente, como exige a CFN 594/2017.',
    accent: 'text-amber-400 bg-amber-900/60',
  },
  {
    icon: UtensilsCrossed,
    title: 'Plano alimentar digital com histórico',
    text: 'Crie o plano alimentar direto no sistema — título, conteúdo, calorias e validade. Cada plano fica salvo no histórico do paciente: consulte, compare ou reaproveite planos anteriores sem sair do prontuário.',
    accent: 'text-lime-400 bg-lime-900/60',
  },
  {
    icon: FileText,
    title: 'Assinatura de documentos',
    text: 'Emita e assine eletronicamente laudos, orientações e planos alimentares. Documentos assinados ficam arquivados no prontuário e podem ser enviados ao paciente.',
    accent: 'text-amber-400 bg-amber-900/60',
  },
  {
    icon: Calendar,
    title: 'Agenda com encaixes e retornos',
    text: 'Gerencie sua agenda de consultas, retornos e encaixes com confirmação automática. Reduza faltas com lembretes e visualize disponibilidade de forma clara.',
    accent: 'text-lime-400 bg-lime-900/60',
  },
  {
    icon: TrendingUp,
    title: 'Avaliação antropométrica com IMC automático',
    text: 'Peso, altura, IMC, circunferências e dobras cutâneas — tudo num só registro. Ao informar peso e altura, o IMC é calculado em tempo real com a classificação (abaixo do peso, normal, sobrepeso, obesidade I, II ou III). Gráficos de evolução para mostrar ao paciente o progresso real ao longo do acompanhamento.',
    accent: 'text-amber-400 bg-amber-900/60',
  },
  {
    icon: Sparkles,
    title: 'IA que gera rascunho — você revisa e assina',
    text: 'O assistente de IA produz um rascunho de evolução para você revisar, corrigir e assinar. A responsabilidade técnica e a conduta são sempre do nutricionista.',
    accent: 'text-lime-400 bg-lime-900/60',
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
    a: 'Sim — 7 dias grátis com acesso completo, sem cartão de crédito e sem compromisso. Para continuar após o teste, os planos começam em R$ 49/mês.',
  },
  {
    q: 'Existe período de teste gratuito?',
    a: 'Sim — 7 dias grátis, sem cartão de crédito. Após o teste, os planos pagos começam em R$ 49/mês, sem contrato anual e com cancelamento quando quiser diretamente pelo painel.',
  },
  {
    q: 'Os dados dos meus pacientes ficam seguros?',
    a: 'Sim. Dados de saúde e alimentação são dados sensíveis conforme a LGPD (art. 11). O UseCognia armazena tudo com criptografia em trânsito e em repouso, com controle de acesso por profissional e backups diários. Você pode exportar ou solicitar exclusão dos dados quando quiser.',
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
            <a href="#features" className="hover:text-amber-600">Funcionalidades</a>
            <a href="#cfn" className="hover:text-amber-600">Conformidade CFN</a>
            <a href="#lead" className="hover:text-amber-600">Checklist grátis</a>
            <Link to="/blog" className="hover:text-amber-600">Blog</Link>
            <Link to="/precos" className="hover:text-amber-600">Planos</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden px-3 py-2 text-sm font-semibold text-[#49443D] hover:text-amber-600 sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              to={REGISTER_URL}
              className="hidden rounded-md bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-400 sm:inline-flex"
            >
              Testar 7 dias grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-950 via-amber-900 to-orange-900 text-white">
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
        {/* Decorative leaf icon */}
        <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 opacity-10">
          <svg width="520" height="520" viewBox="0 0 200 200" fill="white" xmlns="http://www.w3.org/2000/svg">
            {/* Large leaf */}
            <path d="M100 170 C100 170 30 130 25 70 C20 20 80 10 100 30 C120 10 180 20 175 70 C170 130 100 170 100 170 Z"/>
            {/* Center vein */}
            <line x1="100" y1="30" x2="100" y2="170" stroke="rgba(0,0,0,0.3)" strokeWidth="4"/>
            {/* Side veins */}
            <line x1="100" y1="70" x2="55" y2="95" stroke="rgba(0,0,0,0.2)" strokeWidth="2.5"/>
            <line x1="100" y1="90" x2="48" y2="110" stroke="rgba(0,0,0,0.2)" strokeWidth="2.5"/>
            <line x1="100" y1="110" x2="52" y2="128" stroke="rgba(0,0,0,0.2)" strokeWidth="2.5"/>
            <line x1="100" y1="70" x2="145" y2="95" stroke="rgba(0,0,0,0.2)" strokeWidth="2.5"/>
            <line x1="100" y1="90" x2="152" y2="110" stroke="rgba(0,0,0,0.2)" strokeWidth="2.5"/>
            <line x1="100" y1="110" x2="148" y2="128" stroke="rgba(0,0,0,0.2)" strokeWidth="2.5"/>
            {/* Stem */}
            <path d="M100 170 C100 170 95 185 90 195" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-5 lg:py-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-sm font-semibold text-lime-300">
              Para nutricionistas
            </p>

            <h1 className="mt-6 text-[1.9rem] font-bold leading-[1.1] tracking-normal text-white sm:text-5xl lg:text-[3rem]">
              Chega de digitar recordatório alimentar às 22h. Anamnese, plano alimentar e evolução com os campos do CFN — em um só prontuário.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80 sm:text-lg">
              Recordatório de 24h, diário alimentar, avaliação antropométrica e plano alimentar integrados ao prontuário conforme CFN 594/2017. Configure em 5 minutos e atenda com mais tempo para o paciente.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to={REGISTER_URL}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-amber-500 px-6 text-sm font-bold text-white shadow-lg shadow-black/15 hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Teste 7 dias grátis <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/25 px-6 text-sm font-semibold text-white hover:border-white/50"
              >
                Ver como funciona <ChevronRight className="h-4 w-4" />
              </a>
            </div>
            <p className="mt-3 text-sm text-white/40">
              7 dias grátis · sem cartão de crédito
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
              <p className="text-2xl font-bold text-[#211F1C]">Sem fidelidade</p>
              <p className="text-sm text-[#7C776B]">sem contrato anual — cancele quando quiser pelo painel</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Dores ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-600">O problema</p>
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
                className="rounded-2xl border border-amber-100 bg-[#FFFFFF] p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <h3 className="font-semibold text-[#211F1C]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#7C776B]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="border-y border-orange-800/40 bg-orange-950">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-lime-300">
              Funcionalidades
            </p>
            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
              Do recordatório ao plano alimentar, tudo no mesmo prontuário.
            </h2>
            <p className="mt-4 leading-relaxed text-orange-200">
              Campos e fluxos pensados para a nutrição clínica, com IA que apoia sem substituir
              o julgamento do profissional.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text, accent }) => (
              <article
                key={title}
                className="rounded-2xl bg-orange-950/50 border border-orange-800/40 p-5 transition-shadow hover:shadow-lg hover:shadow-orange-900/50"
              >
                <span
                  className={`mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-orange-300">{text}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-amber-700/40 bg-amber-900/50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <p className="text-sm leading-relaxed text-amber-100">
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
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-600">
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
              className="rounded-2xl border border-amber-100 bg-[#FFFFFF] p-6 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Shield className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-600">{norm}</p>
                  <h3 className="mt-1 font-semibold text-[#211F1C]">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#7C776B]">{text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-[#49443D]">
              <strong>Baixe o checklist gratuito</strong> com todos os campos obrigatórios do
              prontuário nutricional segundo a CFN 594/2017.
            </p>
            <a
              href="#lead"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-400"
            >
              Baixar checklist <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Depoimentos ── */}
      <section className="border-y border-[#E7E4DA] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-600">
              O que dizem as nutricionistas
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#211F1C] sm:text-3xl">
              Mais de 500 nutricionistas já escolheram o UseCognia
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                quote: 'Antes eu perdia quase uma hora por dia digitando recordatório alimentar. Agora faço tudo direto no prontuário durante a consulta e ainda tenho os gráficos de evolução prontos para mostrar ao paciente. Economizo tempo e o paciente vê o progresso.',
                name: 'Dra. Juliana Ferreira',
                role: 'Nutricionista clínica, consultório particular — São Paulo',
              },
              {
                quote: 'Trabalho com esportistas e precisava de controle de composição corporal em gráfico. O UseCognia tem isso integrado ao prontuário. Meus pacientes adoram ver a evolução de dobras cutâneas e circunferências em uma linha do tempo.',
                name: 'Rafael Souza',
                role: 'Nutricionista esportivo, Curitiba',
              },
              {
                quote: 'A conformidade com a CFN 594/2017 foi o que me convenceu. Todos os campos obrigatórios já estão no prontuário — anamnese alimentar, diagnóstico nutricional, plano e evolução. Nunca mais me preocupo com a documentação.',
                name: 'Dra. Mariana Costa',
                role: 'Nutricionista, atendimento materno-infantil — Fortaleza',
              },
            ].map(({ quote, name, role }) => (
              <article key={name} className="flex flex-col gap-4 rounded-2xl border border-amber-100 bg-amber-50/40 p-6">
                <div className="flex gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-[#211F1C]">"{quote}"</p>
                <footer>
                  <p className="font-semibold text-[#211F1C]">{name}</p>
                  <p className="text-xs text-[#7C776B]">{role}</p>
                </footer>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Lead Capture ── */}
      <section id="lead" className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
        <div className="mx-auto max-w-xl">
          <div className="mb-8 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-600">
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
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-600">
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
      <section className="bg-gradient-to-br from-amber-900 via-orange-900 to-orange-950 px-4 py-20 text-white sm:px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-lime-300">
            Risco zero — 7 dias grátis
          </p>
          <h2 className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">
            Prontuário nutricional completo, recordatório digital e plano alimentar — sem custo para começar
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/80">
            Configure em 5 minutos e teste por 7 dias sem compromisso. Se não for para você, cancela com um clique.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              to={REGISTER_URL}
              className="inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-md bg-amber-400 px-6 text-sm font-bold text-white shadow-lg hover:bg-white hover:text-amber-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Começar teste grátis <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-sm text-white/75">
              7 dias grátis · sem cartão · cancele quando quiser
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
                className="mt-3 block text-sm text-amber-600 hover:underline"
              >
                usecognia@gmail.com
              </a>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#7C776B]">Produto</p>
              <ul className="space-y-2.5 text-sm text-[#49443D]">
                <li><a href="#features" className="hover:text-amber-600">Funcionalidades</a></li>
                <li><Link to="/precos" className="hover:text-amber-600">Planos pagos</Link></li>
                <li><Link to="/seguranca" className="hover:text-amber-600">Segurança</Link></li>
                <li><Link to="/blog" className="hover:text-amber-600">Blog</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#7C776B]">Conta</p>
              <ul className="space-y-2.5 text-sm text-[#49443D]">
                <li><Link to={REGISTER_URL} className="hover:text-amber-600">Criar conta</Link></li>
                <li><Link to="/login" className="hover:text-amber-600">Entrar</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#7C776B]">Legal</p>
              <ul className="space-y-2.5 text-sm text-[#49443D]">
                <li><Link to="/privacidade" className="hover:text-amber-600">Privacidade</Link></li>
                <li><Link to="/termos" className="hover:text-amber-600">Termos de uso</Link></li>
                <li><Link to="/acessibilidade" className="hover:text-amber-600">Acessibilidade</Link></li>
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
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-amber-500 text-sm font-bold text-white"
        >
          Teste 7 dias grátis <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  )
}
