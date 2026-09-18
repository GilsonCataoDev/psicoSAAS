import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Boxes,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  PackageCheck,
  Percent,
  Shield,
  Sparkles,
  Star,
  UserCheck,
} from 'lucide-react'
import BrandLogo from '@/components/ui/BrandLogo'
import { LeadCaptureForm } from '@/components/marketing/LeadCaptureForm'
import { usePageSeo } from '@/lib/pageSeo'

const REGISTER_URL =
  '/cadastro?utm_source=landing&utm_medium=organic&utm_campaign=esteticistas'

const pains = [
  {
    title: 'Ficha de anamnese em papel ou bloco de notas — risco sanitário e LGPD',
    text: 'Dados de saúde da cliente (alergias, medicamentos, doenças) são dados sensíveis pela LGPD. Guardá-los em papel ou grupo de WhatsApp expõe você a sanções e complica a defesa em caso de reação adversa.',
  },
  {
    title: 'Controle de pacotes em caderno — você perde, a cliente lembra diferente, a briga é certa',
    text: 'Pacote de 10 sessões de drenagem, 4 de 10 usadas — quem controla? Conflitos por contagem de sessões são a principal queixa entre clientes e esteticistas. Com o UseCognia, cada sessão é registrada em tempo real e a cliente vê o saldo junto com você.',
  },
  {
    title: 'Sem termo de consentimento por procedimento — responsabilidade civil exposta',
    text: 'O CDC exige que o prestador de serviço informe riscos e contraindicações. Sem termo assinado por procedimento, qualquer reação vira sua responsabilidade automaticamente.',
  },
]

const features = [
  {
    icon: ClipboardList,
    title: 'Anamnese com Fitzpatrick, contraindicações e histórico',
    text: 'Registre fototipo de Fitzpatrick, tipo de pele, alergias, medicamentos em uso e histórico de tratamentos. Campo de Fitzpatrick por protocolo — nenhum sistema genérico oferece isso. Informação estruturada e acessível em qualquer atendimento.',
    accent: 'text-rose-400 bg-rose-900/60',
  },
  {
    icon: PackageCheck,
    title: 'Controle de pacotes de sessões',
    text: 'Cadastre o pacote da cliente e acompanhe sessões usadas vs. contratadas em tempo real. Nunca mais conflito de contagem — histórico completo para você e para a cliente.',
    accent: 'text-pink-300 bg-pink-900/60',
  },
  {
    icon: Boxes,
    title: 'Estoque de produtos com alerta de mínimo',
    text: 'Cadastre ácidos, seruns, cremes e materiais descartáveis com quantidade atual e alerta de estoque mínimo. Nunca mais perceber no meio do atendimento que o produto acabou.',
    accent: 'text-rose-400 bg-rose-900/60',
  },
  {
    icon: Percent,
    title: 'Controle de comissões da equipe',
    text: 'Defina percentual de comissão por profissional e acompanhe automaticamente o valor a pagar por atendimentos realizados. Sem planilha, sem discussão no fechamento do mês.',
    accent: 'text-pink-300 bg-pink-900/60',
  },
  {
    icon: FileText,
    title: 'Termo de consentimento por procedimento',
    text: 'Gere o termo de consentimento informado com o nome do procedimento, riscos e contraindicações. Arquivo digital vinculado à ficha da cliente para apresentar quando precisar.',
    accent: 'text-pink-300 bg-pink-900/60',
  },
  {
    icon: Calendar,
    title: 'Agenda com confirmação automática',
    text: 'Link de agendamento próprio: a cliente marca, confirma e recebe lembretes automaticamente. Reduza faltas sem depender de mensagens manuais no WhatsApp.',
    accent: 'text-rose-400 bg-rose-900/60',
  },
  {
    icon: UserCheck,
    title: 'Evolução e relatório estético',
    text: 'Registre a evolução de cada sessão — produto, técnica, parâmetros e reações observadas. Emita relatório de progresso para compartilhar com a cliente ao final do protocolo.',
    accent: 'text-pink-300 bg-pink-900/60',
  },
  {
    icon: Sparkles,
    title: 'IA que gera rascunho — você revisa e assina',
    text: 'O assistente de IA produz o rascunho de evolução para você revisar, ajustar e assinar. A conduta técnica e a responsabilidade são sempre suas.',
    accent: 'text-rose-400 bg-rose-900/60',
  },
]

const lgpdItems = [
  {
    norm: 'LGPD — art. 11',
    title: 'Dado sensível de saúde exige proteção reforçada',
    text: 'Alergias, medicamentos, histórico de saúde e fotos antes/depois são dados sensíveis pela LGPD. O UseCognia registra a autorização de uso de imagem integrada à ficha da cliente — sem formulário separado. Armazenamento com criptografia e controles de acesso: fotos e prontuário protegidos no mesmo lugar.',
  },
  {
    norm: 'CDC — art. 6',
    title: 'Consentimento informado como proteção legal',
    text: 'O Código de Defesa do Consumidor obriga o prestador de serviço a informar riscos e contraindicações. O termo de consentimento por procedimento gerado no UseCognia documenta essa obrigação e é sua principal defesa em caso de contestação.',
  },
]

const faq = [
  {
    q: 'Esteticista precisa de sistema específico? Sistema genérico não serve?',
    a: 'Sistemas genéricos não têm controle de pacotes de sessões, anamnese com Fitzpatrick e contraindicações por procedimento, nem termo de consentimento específico por técnica. O UseCognia foi adaptado para o fluxo de uma clínica de estética: da ficha de anamnese ao controle de pacotes e relatório de evolução.',
  },
  {
    q: 'Como funciona o controle de pacotes de sessões?',
    a: 'Ao cadastrar uma cliente, você define o pacote contratado (ex.: 10 sessões de drenagem linfática). A cada sessão realizada, o sistema desconta automaticamente. Você e a cliente acompanham em tempo real quantas sessões foram realizadas e quantas restam — sem caderno, sem conflito de contagem.',
  },
  {
    q: 'O sistema gera o termo de consentimento?',
    a: 'Sim. Você pode emitir o termo de consentimento informado diretamente pelo UseCognia, com o nome do procedimento preenchido automaticamente. O documento fica arquivado na ficha da cliente e pode ser acessado a qualquer momento.',
  },
  {
    q: 'Tem versão gratuita para esteticistas?',
    a: 'Sim — 7 dias grátis com acesso completo, sem cartão de crédito e sem compromisso. Para continuar após o teste, os planos começam em R$ 49/mês.',
  },
  {
    q: 'Existe período de teste gratuito?',
    a: 'Sim — 7 dias grátis com acesso completo, sem cartão de crédito e sem compromisso. Após o teste, os planos pagos começam em R$ 49/mês, sem contrato de fidelidade e com cancelamento quando quiser pelo próprio painel.',
  },
  {
    q: 'Os dados e fotos das minhas clientes ficam seguros?',
    a: 'Sim. Fotos, anamnese e histórico de saúde são dados sensíveis pela LGPD (art. 11). O UseCognia armazena tudo com criptografia em trânsito e em repouso, com controle de acesso por profissional. Você pode exportar ou excluir os dados quando quiser.',
  },
]

export default function EsteticistasPage() {
  usePageSeo({
    title: 'Sistema para esteticistas e clínicas de estética — UseCognia',
    description:
      'Ficha de anamnese digital, controle de pacotes de sessões e termo de consentimento por procedimento. Organize sua clínica de estética com segurança e sem papel.',
    canonicalPath: '/esteticistas',
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
    <main className="landing-readable min-h-screen overflow-x-hidden bg-[#FBF5F8] pb-16 text-[#211F1C] sm:pb-0">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-rose-100 bg-[#FBF5F8]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
          <Link to="/inicio" className="flex min-w-0 items-center gap-2.5">
            <BrandLogo compact className="shrink-0" />
            <span className="text-xl font-bold tracking-tight text-[#211F1C]">
              Use<span className="text-[#2F7657]">Cognia</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#5F5A51] md:flex">
            <a href="#features" className="hover:text-rose-500">Funcionalidades</a>
            <a href="#lgpd" className="hover:text-rose-500">LGPD + CDC</a>
            <a href="#lead" className="hover:text-rose-500">Checklist grátis</a>
            <Link to="/blog" className="hover:text-rose-500">Blog</Link>
            <Link to="/precos" className="hover:text-rose-500">Planos</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden px-3 py-2 text-sm font-semibold text-[#49443D] hover:text-rose-500 sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              to={REGISTER_URL}
              className="hidden rounded-md bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-400 sm:inline-flex"
            >
              Testar 7 dias grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-rose-950 via-pink-900 to-rose-900 text-white">
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
        {/* Decorative diamond icon */}
        <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 opacity-10">
          <svg width="520" height="520" viewBox="0 0 200 200" fill="white" xmlns="http://www.w3.org/2000/svg">
            {/* Large diamond */}
            <path d="M100 20 L170 80 L100 180 L30 80 Z"/>
            {/* Top facets */}
            <path d="M100 20 L130 80 L100 80 Z" fill="rgba(255,255,255,0.6)"/>
            <path d="M100 20 L70 80 L100 80 Z" fill="rgba(255,255,255,0.3)"/>
            {/* Side facets */}
            <path d="M170 80 L130 80 L100 180 Z" fill="rgba(255,255,255,0.15)"/>
            <path d="M30 80 L70 80 L100 180 Z" fill="rgba(255,255,255,0.25)"/>
            {/* Center divider */}
            <line x1="30" y1="80" x2="170" y2="80" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
            {/* Shine lines */}
            <line x1="100" y1="20" x2="100" y2="80" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
            {/* Smaller diamond accent */}
            <path d="M155 20 L170 35 L155 50 L140 35 Z" fill="rgba(255,255,255,0.5)"/>
            <path d="M35 130 L48 143 L35 156 L22 143 Z" fill="rgba(255,255,255,0.3)"/>
          </svg>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-5 lg:py-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-sm font-semibold text-pink-300">
              Para esteticistas e clínicas de estética
            </p>

            <h1 className="mt-6 text-[1.9rem] font-bold leading-[1.1] tracking-normal text-white sm:text-5xl lg:text-[3rem]">
              Chega de conflito com cliente sobre quantas sessões foram feitas. Controle de pacotes em tempo real, anamnese digital e agenda automática — tudo para sua clínica de estética.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80 sm:text-ig">
              Anamnese com fototipo Fitzpatrick e contraindicações, controle de estoque de produtos, termo de consentimento por procedimento e agenda com confirmação automática. Organize sua clínica e proteja você e a cliente.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to={REGISTER_URL}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-rose-500 px-6 text-sm font-bold text-white shadow-lg shadow-black/15 hover:bg-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Testar 7 dias grátis <ArrowRight className="h-4 w-4" />
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
      <section className="border-b border-rose-100 bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
              <p className="text-2xl font-bold text-[#211F1C]">+300</p>
              <p className="text-sm text-[#7C776B]">esteticistas organizam sua clínica no UseCognia</p>
            </div>
            <div className="hidden h-10 w-px bg-rose-100 sm:block" />
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-2xl font-bold text-[#211F1C]">LGPD</p>
              <p className="text-sm text-[#7C776B]">anamnese e fotos da cliente tratadas como dado sensível de saúde</p>
            </div>
            <div className="hidden h-10 w-px bg-rose-100 sm:block" />
            <div className="flex flex-col items-center gap-1 text-center sm:items-end sm:text-right">
              <p className="text-2xl font-bold text-[#211F1C]">5 min</p>
              <p className="text-sm text-[#7C776B]">para configurar e começar a organizar sua clínica</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Dores ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-rose-500">O problema</p>
            <h2 className="mt-3 text-2xl font-bold text-[#211F1C] sm:text-3xl">
              Clínica de estética não é consultório médico — mas os riscos legais são parecidos.
            </h2>
            <p className="mt-4 leading-relaxed text-[#5F5A51]">
              Dados de saúde, procedimentos invasivos e pacotes financeiros criam três pontos cegos que
              sistemas genéricos não resolvem. Um sistema feito para a estética fecha esses gaps.
            </p>
          </div>
          <div className="grid gap-3">
            {pains.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-rose-100 bg-[#FFFFFF] p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <h3 className="font-semibold text-[#211F1C]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#7C776B]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="border-y border-rose-800/40 bg-rose-950">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-pink-300">
              Funcionalidades
            </p>
            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
              Do protocolo à ficha, tudo organizado em um lugar.
            </h2>
            <p className="mt-4 leading-relaxed text-rose-200">
              Campos e fluxos pensados para a estética clínica, com controle financeiro de pacotes
              e documentação que protege você e a cliente.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text, accent }) => (
              <article
                key={title}
                className="rounded-2xl bg-rose-950/50 border border-rose-800/40 p-5 transition-shadow hover:shadow-lg hover:shadow-rose-900/50"
              >
                <span
                  className={`mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-rose-300">{text}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-rose-700/40 bg-rose-900/50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              <p className="text-sm leading-relaxed text-rose-100">
                <strong>Responsabilidade técnica:</strong> a IA do UseCognia gera rascunhos de evolução
                para revisão da profissional. A conduta técnica, a escolha de produtos e os parâmetros de
                equipamento são sempre de responsabilidade exclusiva da esteticista habilitada.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── LGPD + CDC ── */}
      <section id="lgpd" className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-rose-500">
            Proteção legal e regulatória
          </p>
          <h2 className="mt-3 text-2xl font-bold text-[#211F1C] sm:text-3xl">
            Sua clínica protegida pela LGPD e pelo Código de Defesa do Consumidor.
          </h2>
          <p className="mt-4 leading-relaxed text-[#5F5A51]">
            Não existe conselho federal autárquico para esteticistas, mas existem obrigações legais
            claras pela LGPD e pelo CDC que o UseCognia ajuda você a cumprir.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {lgpdItems.map(({ norm, title, text }) => (
            <article
              key={norm}
              className="rounded-2xl border border-rose-100 bg-[#FFFFFF] p-6 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                  <Shield className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-rose-500">{norm}</p>
                  <h3 className="mt-1 font-semibold text-[#211F1C]">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#7C776B]">{text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-[#49443D]">
              <strong>Baixe o checklist gratuito</strong> de documentação para clínicas de estética —
              ficha de anamnese, termo de consentimento e protocolo de proteção de dados.
            </p>
            <a
              href="#lead"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-400"
            >
              Baixar checklist <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Depoimentos ── */}
      <section className="border-y border-rose-100 bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-rose-500">
              O que dizem as esteticistas
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#211F1C] sm:text-3xl">
              Mais de 300 esteticistas já escolheram o UseCognia
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                quote: 'Eu controlava os pacotes de sessões em caderno e vivia tendo conflito com cliente sobre quantas sessões tinham sido feitas. Com o UseCognia acabou isso. A cliente acompanha junto e nunca mais tive discussão sobre contagem.',
                name: 'Camila Rodrigues',
                role: 'Esteticista clínica, clínica própria — Rio de Janeiro',
              },
              {
                quote: 'O controle de estoque de produtos mudou minha rotina. Antes eu descobria no meio do atendimento que o ácido tinha acabado. Agora tenho alerta de estoque mínimo e nunca mais passei por isso.',
                name: 'Beatriz Monteiro',
                role: 'Esteticista, especialista em harmonização facial — Campinas',
              },
              {
                quote: 'A ficha de anamnese com Fitzpatrick e o termo de consentimento digital me deram muito mais segurança. Se alguma cliente tiver qualquer reação, tenho tudo documentado e assinado — isso é proteção real.',
                name: 'Karen Nascimento',
                role: 'Esteticista clínica, atendimento domiciliar — Brasília',
              },
            ].map(({ quote, name, role }) => (
              <article key={name} className="flex flex-col gap-4 rounded-2xl border border-rose-100 bg-rose-50/40 p-6">
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
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-rose-500">
              Recurso gratuito
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#211F1C]">
              Checklist gratuito de documentação para clínicas de estética
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#5F5A51]">
              Ficha de anamnese, termo de consentimento e proteção de dados: o que sua clínica precisa
              ter documentado para estar protegida pela LGPD e pelo CDC.
            </p>
          </div>
          <LeadCaptureForm
            source="landing-esteticistas"
            defaultProfession="estetica"
            title="Quero o checklist de documentação"
            ctaLabel="Enviar checklist por e-mail"
          />
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-y border-rose-100 bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
          <div className="mx-auto max-w-2xl">
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-rose-500">
                Dúvidas frequentes
              </p>
              <h2 className="mt-3 text-2xl font-bold text-[#211F1C] sm:text-3xl">
                Perguntas de esteticistas
              </h2>
            </div>
            <div className="mt-10 divide-y divide-rose-100">
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
      <section className="bg-gradient-to-br from-pink-900 via-rose-900 to-rose-950 px-4 py-20 text-white sm:px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-pink-300">
            Risco zero — 7 dias grátis
          </p>
          <h2 className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">
            Anamnese digital, controle de pacotes e agenda automática — sem custo para começar
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/80">
            Configure sua clínica em 5 minutos e teste por 7 dias sem compromisso. Se não for para você, cancela com um clique.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              to={REGISTER_URL}
              className="inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-md bg-rose-400 px-6 text-sm font-bold text-white shadow-lg hover:bg-white hover:text-rose-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
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
      <footer className="border-t border-rose-100 bg-[#FBF5F8]">
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
                Agenda, registros e cobranças para profissionais de saúde e estética.
              </p>
              <a
                href="mailto:usecognia@gmail.com"
                className="mt-3 block text-sm text-rose-500 hover:underline"
              >
                usecognia@gmail.com
              </a>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#7C776B]">Produto</p>
              <ul className="space-y-2.5 text-sm text-[#49443D]">
                <li><a href="#features" className="hover:text-rose-500">Funcionalidades</a></li>
                <li><Link to="/precos" className="hover:text-rose-500">Planos pagos</Link></li>
                <li><Link to="/seguranca" className="hover:text-rose-500">Segurança</Link></li>
                <li><Link to="/blog" className="hover:text-rose-500">Blog</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#7C776B]">Conta</p>
              <ul className="space-y-2.5 text-sm text-[#49443D]">
                <li><Link to={REGISTER_URL} className="hover:text-rose-500">Criar conta</Link></li>
                <li><Link to="/login" className="hover:text-rose-500">Entrar</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#7C776B]">Legal</p>
              <ul className="space-y-2.5 text-sm text-[#49443D]">
                <li><Link to="/privacidade" className="hover:text-rose-500">Privacidade</Link></li>
                <li><Link to="/termos" className="hover:text-rose-500">Termos de uso</Link></li>
                <li><Link to="/acessibilidade" className="hover:text-rose-500">Acessibilidade</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-rose-100 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#A9A394]">© {new Date().getFullYear()} UseCognia. Todos os direitos reservados.</p>
            <p className="text-xs text-[#A9A394]">Feito para profissionais de saúde e estética no Brasil.</p>
          </div>
        </div>
      </footer>

      {/* ── Mobile sticky CTA ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rose-100 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden">
        <Link
          to={REGISTER_URL}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-rose-500 text-sm font-bold text-white"
        >
          Teste 7 dias grátis <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  )
}
