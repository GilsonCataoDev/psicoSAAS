import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Brain,
  ChevronRight,
  BarChart3,
  Sparkles,
  FileCheck2,
  Layers,
  Zap,
  Shield,
  CheckCircle2,
  Star,
  ClipboardList,
} from 'lucide-react'
import BrandLogo from '@/components/ui/BrandLogo'
import { LeadCaptureForm } from '@/components/marketing/LeadCaptureForm'
import { usePageSeo } from '@/lib/pageSeo'

const REGISTER_URL =
  '/cadastro?utm_source=landing&utm_medium=organic&utm_campaign=psicologos'

const pains = [
  {
    title: 'Prontuário no caderno ou em Word — sem estrutura para anamnese psicológica e antecedentes',
    text: 'Documentos genéricos não têm campos para história do desenvolvimento, antecedentes familiares, hipótese diagnóstica e evolução por sessão com a linguagem do CFP.',
  },
  {
    title: 'Escalas como PHQ-9 e GAD-7 calculadas à mão — risco de erro e perda de tempo',
    text: 'Aplicar, somar e interpretar escalas manualmente em cada sessão consome tempo clínico valioso e aumenta o risco de erro de pontuação.',
  },
  {
    title: 'Relatórios e atestados criados do zero a cada vez — sem conformidade automática com o CFP',
    text: 'Sem modelo estruturado, cada documento é reescrito do zero sem garantia de que inclui todos os elementos exigidos pela CFP Res. 06/2019.',
  },
]

const features = [
  {
    icon: ClipboardList,
    title: 'Prontuário psicológico completo',
    text: 'Anamnese, HDA, antecedentes pessoais e familiares, hipótese diagnóstica e evolução por sessão em campos estruturados para a clínica psicológica.',
    accent: 'text-indigo-600 bg-indigo-50',
  },
  {
    icon: BarChart3,
    title: '25+ escalas validadas com pontuação automática',
    text: 'PHQ-9, GAD-7, DASS-21, BDI-II, BAI e outras escalas com aplicação digital, cálculo automático do escore e gráfico de evolução ao longo do tratamento.',
    accent: 'text-sky-600 bg-sky-50',
  },
  {
    icon: Sparkles,
    title: 'Avaliação Neuropsicológica guiada por IA',
    text: 'Módulo exclusivo para estruturar laudos neuropsicológicos, integrar resultados de instrumentos e gerar rascunho de laudo para revisão do profissional.',
    accent: 'text-violet-600 bg-violet-50',
  },
  {
    icon: FileCheck2,
    title: 'Relatório e Atestado Psicológico conforme CFP Res. 06/2019',
    text: 'Modelos de documentos psicológicos com todos os elementos exigidos pela resolução: identificação, método, resultados, conclusão e assinatura do CRP.',
    accent: 'text-sage-600 bg-sage-50',
  },
  {
    icon: Layers,
    title: 'Plano terapêutico estruturado',
    text: 'Registre abordagem teórica, objetivos terapêuticos, frequência e metas de curto e longo prazo — tudo vinculado ao prontuário do paciente.',
    accent: 'text-amber-600 bg-amber-50',
  },
  {
    icon: Zap,
    title: 'IA para redigir evoluções e resumos de sessão',
    text: 'Gere um rascunho da evolução de sessão com base nos tópicos que você anotou. O texto final é sempre revisado e assinado pelo psicólogo.',
    accent: 'text-emerald-600 bg-emerald-50',
  },
]

const cfpItems = [
  {
    norm: 'CFP Res. 001/2009',
    title: 'Prontuário Psicológico',
    text: 'Define os campos obrigatórios do prontuário: identificação, demanda, hipótese diagnóstica, evolução e encerramento do caso. O UseCognia estrutura todos esses campos nativamente.',
  },
  {
    norm: 'CFP Res. 06/2019',
    title: 'Documentos Psicológicos',
    text: 'Regulamenta a elaboração de relatórios, laudos, declarações e atestados psicológicos. Os modelos do UseCognia seguem a estrutura exigida pela resolução.',
  },
]

const faq = [
  {
    q: 'Posso usar sem ser psicólogo?',
    a: 'O UseCognia tem versões para psicólogos, fisioterapeutas e nutricionistas. Ao se cadastrar você seleciona sua profissão e o sistema exibe apenas os campos e funcionalidades do seu conselho. O módulo de prontuário psicológico e as escalas são exclusivos para psicólogos.',
  },
  {
    q: 'As escalas têm pontuação automática?',
    a: 'Sim. Ao aplicar uma escala o sistema calcula automaticamente o escore total, o escore por subescala (quando aplicável) e exibe a classificação de severidade conforme o manual do instrumento. Você ainda pode adicionar observações clínicas antes de salvar.',
  },
  {
    q: 'O relatório psicológico segue o CFP?',
    a: 'Os modelos de documentos psicológicos foram elaborados com base na CFP Res. 06/2019 e incluem todos os elementos obrigatórios: dados de identificação, método utilizado, análise, conclusão e identificação do profissional com número de CRP. A responsabilidade pelo conteúdo técnico é sempre do psicólogo.',
  },
  {
    q: 'Funciona em tablet/celular?',
    a: 'Sim. O UseCognia é responsivo e funciona em qualquer dispositivo com navegador moderno — computador, tablet ou celular. Ideal para quem atende em consultório e precisa registrar evoluções durante ou logo após a sessão.',
  },
]

export default function PsicologosPage() {
  usePageSeo({
    title: 'Prontuário psicológico digital — UseCognia',
    description:
      'Prontuário psicológico com escalas automáticas (PHQ-9, GAD-7, DASS-21), relatório conforme CFP Res. 06/2019 e IA para redigir evoluções. Mais de 600 psicólogos no UseCognia.',
    canonicalPath: '/psicologos',
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
            <a href="#cfp" className="hover:text-sage-700">Conformidade CFP</a>
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
              Para psicólogos
            </p>

            <h1 className="mt-6 text-[1.9rem] font-bold leading-[1.1] tracking-normal text-white sm:text-5xl lg:text-[3rem]">
              Acabou o prontuário no caderno. Anamnese, escalas e evolução em um só lugar.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80 sm:text-lg">
              O UseCognia foi feito para psicólogos: prontuário conforme CFP 001/2009, 25+ escalas
              com pontuação automática e documentos psicológicos segundo CFP Res. 06/2019 — tudo
              em um lugar.
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
              <p className="text-2xl font-bold text-[#211F1C]">+600</p>
              <p className="text-sm text-[#7C776B]">psicólogos organizam seus atendimentos no UseCognia</p>
            </div>
            <div className="hidden h-10 w-px bg-[#E7E4DA] sm:block" />
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-2xl font-bold text-[#211F1C]">4.9 / 5</p>
              <p className="text-sm text-[#7C776B]">avaliação média pelos profissionais cadastrados</p>
            </div>
            <div className="hidden h-10 w-px bg-[#E7E4DA] sm:block" />
            <div className="flex flex-col items-center gap-1 text-center sm:items-end sm:text-right">
              <p className="text-2xl font-bold text-[#211F1C]">LGPD</p>
              <p className="text-sm text-[#7C776B]">dados dos pacientes protegidos conforme a lei</p>
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
              O sistema que você usa foi feito para médicos, não para psicólogos.
            </h2>
            <p className="mt-4 leading-relaxed text-[#5F5A51]">
              Prontuário genérico não documenta o raciocínio clínico psicológico, não aplica escalas
              padronizadas e não gera os documentos exigidos pelo CFP. O resultado é tempo perdido
              e risco regulatório desnecessário.
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
              Da anamnese ao laudo, tudo no mesmo prontuário psicológico.
            </h2>
            <p className="mt-4 leading-relaxed text-[#5F5A51]">
              Campos e fluxos pensados para a psicologia clínica, com IA que apoia sem substituir
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

          <div className="mt-8 rounded-lg border border-indigo-100 bg-indigo-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
              <p className="text-sm leading-relaxed text-[#49443D]">
                <strong>Responsabilidade técnica:</strong> a IA do UseCognia gera rascunhos para
                revisão do profissional. O diagnóstico psicológico, a conduta clínica e os
                documentos psicológicos são sempre de responsabilidade exclusiva do psicólogo
                habilitado, conforme a CFP Res. 001/2009 e a CFP Res. 06/2019.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Conformidade regulatória (CFP) ── */}
      <section id="cfp" className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">
            Conformidade regulatória
          </p>
          <h2 className="mt-3 text-2xl font-bold text-[#211F1C] sm:text-3xl">
            Prontuário alinhado às resoluções do CFP.
          </h2>
          <p className="mt-4 leading-relaxed text-[#5F5A51]">
            O UseCognia foi desenhado com base nas resoluções do Conselho Federal de Psicologia
            para garantir que sua documentação clínica esteja em conformidade.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {cfpItems.map(({ norm, title, text }) => (
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
              prontuário psicológico segundo a CFP Res. 001/2009.
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
                "Antes eu aplicava o PHQ-9 no papel e somava à mão. Agora o paciente responde
                direto no sistema, o escore é calculado automaticamente e eu já vejo o gráfico
                de evolução desde a primeira sessão. Economizo uns 20 minutos por atendimento."
              </p>
              <footer className="mt-4">
                <p className="font-semibold text-[#211F1C]">Psicóloga clínica — abordagem TCC</p>
                <p className="text-sm text-[#7C776B]">Atendimento em consultório particular, Belo Horizonte</p>
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
              Receba o checklist gratuito de campos obrigatórios do prontuário psicológico
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#5F5A51]">
              Checklist CFP 001/2009: todos os campos obrigatórios que o prontuário psicológico
              precisa ter para estar em conformidade com a resolução.
            </p>
          </div>
          <LeadCaptureForm
            source="landing-psicologos"
            defaultProfession="psicologia"
            professionOptions={['psicologia']}
            title="Quero o checklist CFP 001/2009"
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
                Perguntas de psicólogos
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
            Prontuário psicológico, escalas automáticas e documentos conforme o CFP em um só
            lugar. Configure seu consultório em menos de 5 minutos.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              to="/cadastro?profissao=psicologia"
              className="inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-md bg-[#CFF3DE] px-6 text-sm font-bold text-[#143D2D] shadow-lg hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Começar grátis <ArrowRight className="h-4 w-4" />
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
          to="/cadastro?profissao=psicologia"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-sage-800 text-sm font-bold text-white"
        >
          Começar grátis <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

    </main>
  )
}
