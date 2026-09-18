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
    title: 'Prontuário em conformidade com CFP Res. 001/2009',
    text: 'Campos obrigatórios da resolução já estruturados: identificação completa, demanda, hipótese diagnóstica, evolução por sessão, plano terapêutico e prazo de guarda. Sem adaptar sistema de médico — tudo pensado para a psicologia clínica.',
    accent: 'text-indigo-400 bg-indigo-900/60',
  },
  {
    icon: BarChart3,
    title: '25+ escalas validadas com pontuação automática',
    text: 'PHQ-9, GAD-7, DASS-21, BDI-II (versão adaptada para o Brasil), BAI (versão adaptada para o Brasil) e outras escalas com aplicação digital, cálculo automático do escore e gráfico de evolução ao longo do tratamento.',
    accent: 'text-purple-400 bg-purple-900/60',
  },
  {
    icon: Sparkles,
    title: 'Avaliação Neuropsicológica guiada por IA',
    text: 'Módulo para auxiliar na estruturação de laudos neuropsicológicos e gerar rascunho de laudo para revisão e validação do profissional. A interpretação dos instrumentos e as conclusões diagnósticas são sempre de responsabilidade exclusiva do neuropsicólogo.',
    accent: 'text-violet-400 bg-violet-900/60',
  },
  {
    icon: FileCheck2,
    title: 'Relatório e Atestado Psicológico conforme CFP Res. 06/2019',
    text: 'Modelos de documentos psicológicos com todos os elementos exigidos pela resolução: identificação, método, resultados, conclusão e assinatura do CRP.',
    accent: 'text-indigo-400 bg-indigo-900/60',
  },
  {
    icon: Layers,
    title: 'Plano terapêutico estruturado',
    text: 'Registre abordagem teórica, objetivos terapêuticos, frequência e metas de curto e longo prazo — tudo vinculado ao prontuário do paciente.',
    accent: 'text-purple-400 bg-purple-900/60',
  },
  {
    icon: Zap,
    title: 'IA para redigir evoluções e resumos de sessão',
    text: 'Gere um rascunho da evolução de sessão com base nos tópicos que você anotou. O texto final é sempre revisado e assinado pelo psicólogo.',
    accent: 'text-violet-400 bg-violet-900/60',
  },
]

const cfpItems = [
  {
    norm: 'CFP Res. 001/2009 (e alterações – Res. 05/2010)',
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
    a: 'Os modelos de documentos psicológicos foram elaborados com base na CFP Res. 06/2019 e contemplam os elementos previstos na resolução: dados de identificação, método utilizado, análise, conclusão e identificação do profissional com número de CRP. A responsabilidade pelo conteúdo técnico é sempre do psicólogo.',
  },
  {
    q: 'Funciona em tablet/celular?',
    a: 'Sim. O UseCognia é responsivo e funciona em qualquer dispositivo com navegador moderno — computador, tablet ou celular. Ideal para quem atende em consultório e precisa registrar evoluções durante ou logo após a sessão.',
  },
  {
    q: 'Existe período de teste gratuito?',
    a: 'Sim — 7 dias grátis, sem cartão de crédito e sem compromisso. Após o período de teste, os planos pagos começam em R$ 49/mês, sem contrato de fidelidade e com cancelamento quando quiser diretamente pelo painel.',
  },
  {
    q: 'Meus dados e os dos meus pacientes estão seguros?',
    a: 'Sim. O UseCognia trata dados clínicos como dados sensíveis de saúde conforme a LGPD (art. 11). Os dados são armazenados com criptografia em trânsito e em repouso, com controle de acesso por profissional e backups diários. Você pode exportar ou solicitar exclusão dos dados a qualquer momento.',
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
            <a href="#features" className="hover:text-indigo-600">Funcionalidades</a>
            <a href="#cfp" className="hover:text-indigo-600">Conformidade CFP</a>
            <a href="#lead" className="hover:text-indigo-600">Checklist grátis</a>
            <Link to="/blog" className="hover:text-indigo-600">Blog</Link>
            <Link to="/precos" className="hover:text-indigo-600">Planos</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden px-3 py-2 text-sm font-semibold text-[#49443D] hover:text-indigo-600 sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              to={REGISTER_URL}
              className="hidden rounded-md bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 sm:inline-flex"
            >
              Testar 7 dias grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 text-white">
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
        {/* Decorative brain icon */}
        <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 opacity-10">
          <svg width="520" height="520" viewBox="0 0 200 200" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 25 C82 25 67 36 62 52 C54 48 44 50 40 60 C32 58 25 65 26 74 C19 77 14 86 17 95 C13 105 18 116 28 120 C30 135 43 145 58 142 C63 154 75 162 89 159 L89 175 L111 175 L111 159 C125 162 137 154 142 142 C157 145 170 135 172 120 C182 116 187 105 183 95 C186 86 181 77 174 74 C175 65 168 58 160 60 C156 50 146 48 138 52 C133 36 118 25 100 25 Z"/>
            <path d="M75 85 Q100 92 125 85" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <path d="M70 105 Q100 114 130 105" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <path d="M78 124 Q100 131 122 124" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <line x1="100" y1="60" x2="100" y2="142" stroke="white" strokeWidth="2" strokeDasharray="4 3"/>
          </svg>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-5 lg:py-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-sm font-semibold text-purple-300">
              Para psicólogos
            </p>

            <h1 className="mt-6 text-[1.9rem] font-bold leading-[1.1] tracking-normal text-white sm:text-5xl lg:text-[3rem]">
              Chega de somar PHQ-9 à mão e escrever evolução do zero. Prontuário psicológico com os campos do CFP e escalas automáticas — em minutos.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80 sm:text-lg">
              Anamnese estruturada conforme CFP 001/2009, 25+ escalas com pontuação automática (PHQ-9, GAD-7, DASS-21) e documentos psicológicos segundo CFP Res. 06/2019. Configure seu consultório em 5 minutos — sem instalar nada.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to={REGISTER_URL}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-indigo-500 px-6 text-sm font-bold text-white shadow-lg shadow-black/15 hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
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
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-500">O problema</p>
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
                className="rounded-2xl border border-indigo-100 bg-[#FFFFFF] p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <h3 className="font-semibold text-[#211F1C]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#7C776B]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="border-y border-indigo-800/40 bg-indigo-950">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-purple-300">
              Funcionalidades
            </p>
            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
              Da anamnese ao laudo, tudo no mesmo prontuário psicológico.
            </h2>
            <p className="mt-4 leading-relaxed text-indigo-200">
              Campos e fluxos pensados para a psicologia clínica, com IA que apoia sem substituir
              o julgamento do profissional.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text, accent }) => (
              <article
                key={title}
                className="rounded-2xl bg-indigo-950/50 border border-indigo-800/40 p-5 transition-shadow hover:shadow-lg hover:shadow-indigo-900/50"
              >
                <span
                  className={`mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-indigo-300">{text}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-indigo-700/40 bg-indigo-900/50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-400" />
              <p className="text-sm leading-relaxed text-indigo-100">
                <strong>Responsabilidade técnica:</strong> a IA do UseCognia gera rascunhos para
                revisão do profissional. O diagnóstico psicológico, a conduta clínica e os
                documentos psicológicos são sempre de responsabilidade exclusiva do psicólogo
                habilitado, conforme a CFP Res. 001/2009 (e alterações Res. 05/2010) e a CFP Res. 06/2019.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-purple-700/40 bg-purple-900/30 p-5">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-purple-400" />
              <p className="text-sm leading-relaxed text-indigo-100">
                <strong>Privacidade dos dados clínicos:</strong> prontuários e dados de saúde são tratados como dados sensíveis (LGPD art. 11) e nunca são usados para treinar modelos de IA de terceiros. Armazenamento com criptografia em trânsito e em repouso — seus prontuários ficam só seus.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Conformidade regulatória (CFP) ── */}
      <section id="cfp" className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-500">
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
              className="rounded-2xl border border-indigo-100 bg-[#FFFFFF] p-6 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                  <Shield className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-500">{norm}</p>
                  <h3 className="mt-1 font-semibold text-[#211F1C]">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#7C776B]">{text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-[#49443D]">
              <strong>Baixe o checklist gratuito</strong> com todos os campos obrigatórios do
              prontuário psicológico segundo a CFP Res. 001/2009 (e alterações Res. 05/2010).
            </p>
            <a
              href="#lead"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400"
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
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-500">
              O que dizem os psicólogos
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#211F1C] sm:text-3xl">
              Mais de 600 psicólogos já escolheram o UseCognia
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                quote: 'Antes eu aplicava o PHQ-9 no papel e somava à mão. Agora o paciente responde no sistema, o escore é calculado na hora e eu vejo o gráfico de evolução de todas as sessões. Economizo pelo menos 2 horas por semana.',
                name: 'Dra. Carolina Menezes',
                role: 'Psicóloga clínica (TCC), Belo Horizonte',
              },
              {
                quote: 'O prontuário com os campos da CFP 001/2009 me deu segurança. Preencho anamnese, hipótese diagnóstica e evolução por sessão tudo em um lugar — e sei que está dentro do que o CFP exige.',
                name: 'Paulo Henrique Borges',
                role: 'Psicólogo clínico, consultório particular — São Paulo',
              },
              {
                quote: 'O plano terapêutico vinculado ao prontuário mudou o jeito que eu acompanho meus pacientes. Em 5 minutos já tenho o rascunho da evolução pronto para revisar e assinar. Recomendo para qualquer psicólogo de consultório.',
                name: 'Dra. Fernanda Lopes',
                role: 'Psicóloga clínica infantil, Porto Alegre',
              },
            ].map(({ quote, name, role }) => (
              <article key={name} className="flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6">
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
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-500">
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
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-500">
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
      <section className="bg-gradient-to-br from-purple-900 via-indigo-900 to-indigo-950 px-4 py-20 text-white sm:px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-purple-300">
            Risco zero — 7 dias grátis
          </p>
          <h2 className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">
            Prontuário psicológico completo, escalas automáticas e documentos CFP — sem custo para começar
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/80">
            Configure seu consultório em 5 minutos e teste por 7 dias sem compromisso. Se não for para você, cancela com um clique.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              to="/cadastro?profissao=psicologia"
              className="inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-md bg-indigo-400 px-6 text-sm font-bold text-white shadow-lg hover:bg-white hover:text-indigo-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
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
                className="mt-3 block text-sm text-indigo-500 hover:underline"
              >
                usecognia@gmail.com
              </a>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#7C776B]">Produto</p>
              <ul className="space-y-2.5 text-sm text-[#49443D]">
                <li><a href="#features" className="hover:text-indigo-500">Funcionalidades</a></li>
                <li><Link to="/precos" className="hover:text-indigo-500">Planos pagos</Link></li>
                <li><Link to="/seguranca" className="hover:text-indigo-500">Segurança</Link></li>
                <li><Link to="/blog" className="hover:text-indigo-500">Blog</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#7C776B]">Conta</p>
              <ul className="space-y-2.5 text-sm text-[#49443D]">
                <li><Link to={REGISTER_URL} className="hover:text-indigo-500">Criar conta</Link></li>
                <li><Link to="/login" className="hover:text-indigo-500">Entrar</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#7C776B]">Legal</p>
              <ul className="space-y-2.5 text-sm text-[#49443D]">
                <li><Link to="/privacidade" className="hover:text-indigo-500">Privacidade</Link></li>
                <li><Link to="/termos" className="hover:text-indigo-500">Termos de uso</Link></li>
                <li><Link to="/acessibilidade" className="hover:text-indigo-500">Acessibilidade</Link></li>
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
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-indigo-500 text-sm font-bold text-white"
        >
          Teste 7 dias grátis <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

    </main>
  )
}
