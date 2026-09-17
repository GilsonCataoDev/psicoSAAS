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

// ── Paleta de cores da profissão ─────────────────────────────────────────────
// Hero: #2D1A2E (plum profundo) — diferenciado do verde floresta das outras LPs
// Accent: #B5507A (rosa mauve) — elegante, premium, sem ser cor-de-rosa genérico
// Base: #FBF5F8 (blush off-white) — fundo levemente rosado vs. o creme das demais

const pains = [
  {
    title: 'Ficha de anamnese em papel ou bloco de notas — risco sanitário e LGPD',
    text: 'Dados de saúde da cliente (alergias, medicamentos, doenças) são dados sensíveis pela LGPD. Guardá-los em papel ou grupo de WhatsApp expõe você a sanções e complica a defesa em caso de reação adversa.',
  },
  {
    title: 'Controle de pacotes de sessões em caderno — você perde, a cliente recorda diferente',
    text: 'Pacote de 10 sessões de drenagem, 4 de 10 usadas — quem controla? Conflitos por contagem de sessões são a principal queixa entre clientes e esteticistas. Um sistema elimina o problema na raiz.',
  },
  {
    title: 'Sem termo de consentimento por procedimento — responsabilidade civil exposta',
    text: 'O CDC exige que o prestador de serviço informe riscos e contraindicações. Sem termo assinado por procedimento, qualquer reação vira sua responsabilidade automaticamente.',
  },
]

const features = [
  {
    icon: ClipboardList,
    title: 'Anamnese estética digital',
    text: 'Registre fototipo Fitzpatrick, tipo de pele, contraindicações, medicamentos em uso e histórico de tratamentos. Informação estruturada, acessível em qualquer atendimento.',
    accent: 'text-rose-600 bg-rose-50',
  },
  {
    icon: PackageCheck,
    title: 'Controle de pacotes de sessões',
    text: 'Cadastre o pacote da cliente e acompanhe sessões usadas vs. contratadas em tempo real. Nunca mais conflito de contagem — histórico completo para você e para a cliente.',
    accent: 'text-fuchsia-600 bg-fuchsia-50',
  },
  {
    icon: Boxes,
    title: 'Estoque de produtos',
    text: 'Cadastre ácidos, seruns, cremes e materiais descartáveis com quantidade atual e alerta de estoque mínimo. Nunca mais perceber no meio do atendimento que o produto acabou.',
    accent: 'text-amber-600 bg-amber-50',
  },
  {
    icon: FileText,
    title: 'Termo de consentimento por procedimento',
    text: 'Gere o termo de consentimento informado com o nome do procedimento, riscos e contraindicações. Arquivo digital vinculado à ficha da cliente para apresentar quando precisar.',
    accent: 'text-pink-600 bg-pink-50',
  },
  {
    icon: Calendar,
    title: 'Agenda com confirmação automática',
    text: 'Link de agendamento próprio: a cliente marca, confirma e recebe lembretes automaticamente. Reduza faltas sem depender de mensagens manuais no WhatsApp.',
    accent: 'text-violet-600 bg-violet-50',
  },
  {
    icon: UserCheck,
    title: 'Evolução e relatório estético',
    text: 'Registre a evolução de cada sessão — produto, técnica, parâmetros e reações observadas. Emita relatório de progresso para compartilhar com a cliente ao final do protocolo.',
    accent: 'text-purple-600 bg-purple-50',
  },
  {
    icon: Sparkles,
    title: 'IA que gera rascunho — você revisa e assina',
    text: 'O assistente de IA produz o rascunho de evolução para você revisar, ajustar e assinar. A conduta técnica e a responsabilidade são sempre suas.',
    accent: 'text-indigo-600 bg-indigo-50',
  },
]

const lgpdItems = [
  {
    norm: 'LGPD — art. 11',
    title: 'Dado sensível de saúde exige proteção reforçada',
    text: 'Alergias, medicamentos, histórico de saúde e fotos antes/depois são dados sensíveis pela LGPD — independentemente de você ser ou não profissional de saúde no sentido regulatório. O UseCognia trata esses dados com criptografia e controles de acesso adequados.',
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
      <header className="sticky top-0 z-20 border-b border-[#F0DDE8] bg-[#FBF5F8]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
          <Link to="/inicio" className="flex min-w-0 items-center gap-2.5">
            <BrandLogo compact className="shrink-0" />
            <span className="text-xl font-bold tracking-tight text-[#211F1C]">
              Use<span className="text-[#2F7657]">Cognia</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#5F5A51] md:flex">
            <a href="#features" className="hover:text-[#B5507A]">Funcionalidades</a>
            <a href="#lgpd" className="hover:text-[#B5507A]">LGPD + CDC</a>
            <a href="#lead" className="hover:text-[#B5507A]">Checklist grátis</a>
            <Link to="/blog" className="hover:text-[#B5507A]">Blog</Link>
            <Link to="/precos" className="hover:text-[#B5507A]">Planos</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden px-3 py-2 text-sm font-semibold text-[#49443D] hover:text-[#B5507A] sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              to={REGISTER_URL}
              className="hidden rounded-md bg-[#2D1A2E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#3D2140] sm:inline-flex"
            >
              Testar 7 dias grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#2D1A2E] text-white">
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-5 lg:py-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-sm font-semibold text-[#F9D8E8]">
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
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#F9D8E8] px-6 text-sm font-bold text-[#4A1030] shadow-lg shadow-black/15 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
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
      <section className="border-b border-[#F0DDE8] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
              <p className="text-2xl font-bold text-[#211F1C]">+300</p>
              <p className="text-sm text-[#7C776B]">esteticistas organizam sua clínica no UseCognia</p>
            </div>
            <div className="hidden h-10 w-px bg-[#F0DDE8] sm:block" />
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-2xl font-bold text-[#211F1C]">LGPD</p>
              <p className="text-sm text-[#7C776B]">anamnese e fotos da cliente tratadas como dado sensível de saúde</p>
            </div>
            <div className="hidden h-10 w-px bg-[#F0DDE8] sm:block" />
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
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#B5507A]">O problema</p>
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
                className="rounded-lg border border-[#F0DDE8] bg-[#FFFFFF] p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <h3 className="font-semibold text-[#211F1C]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#7C776B]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="border-y border-[#F0DDE8] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#B5507A]">
              Funcionalidades
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#211F1C] sm:text-3xl">
              Do protocolo à ficha, tudo organizado em um lugar.
            </h2>
            <p className="mt-4 leading-relaxed text-[#5F5A51]">
              Campos e fluxos pensados para a estética clínica, com controle financeiro de pacotes
              e documentação que protege você e a cliente.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text, accent }) => (
              <article
                key={title}
                className="rounded-lg border border-[#F0DDE8] bg-[#FBF5F8] p-5 transition-shadow hover:shadow-md"
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

          <div className="mt-8 rounded-lg border border-rose-100 bg-rose-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <p className="text-sm leading-relaxed text-[#49443D]">
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
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#B5507A]">
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
              className="rounded-lg border border-[#F0DDE8] bg-[#FFFFFF] p-6 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FDF0F5] text-[#B5507A]">
                  <Shield className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#B5507A]">{norm}</p>
                  <h3 className="mt-1 font-semibold text-[#211F1C]">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#7C776B]">{text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-[#F0DDE8] bg-[#FDF0F5] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-[#49443D]">
              <strong>Baixe o checklist gratuito</strong> de documentação para clínicas de estética —
              ficha de anamnese, termo de consentimento e protocolo de proteção de dados.
            </p>
            <a
              href="#lead"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-[#2D1A2E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3D2140]"
            >
              Baixar checklist <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Depoimentos ── */}
      <section className="border-y border-[#F0DDE8] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#B5507A]">
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
              <article key={name} className="flex flex-col gap-4 rounded-lg border border-[#F0DDE8] bg-[#FBF5F8] p-6">
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
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#B5507A]">
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
      <section className="border-y border-[#F0DDE8] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
          <div className="mx-auto max-w-2xl">
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#B5507A]">
                Dúvidas frequentes
              </p>
              <h2 className="mt-3 text-2xl font-bold text-[#211F1C] sm:text-3xl">
                Perguntas de esteticistas
              </h2>
            </div>
            <div className="mt-10 divide-y divide-[#F0DDE8]">
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
      <section className="bg-[#2D1A2E] px-4 py-20 text-white sm:px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#F9D8E8]">
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
              className="inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-md bg-[#F9D8E8] px-6 text-sm font-bold text-[#4A1030] shadow-lg hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
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
      <footer className="border-t border-[#F0DDE8] bg-[#FBF5F8]">
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
                className="mt-3 block text-sm text-[#B5507A] hover:underline"
              >
                usecognia@gmail.com
              </a>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#7C776B]">Produto</p>
              <ul className="space-y-2.5 text-sm text-[#49443D]">
                <li><a href="#features" className="hover:text-[#B5507A]">Funcionalidades</a></li>
                <li><Link to="/precos" className="hover:text-[#B5507A]">Planos pagos</Link></li>
                <li><Link to="/seguranca" className="hover:text-[#B5507A]">Segurança</Link></li>
                <li><Link to="/blog" className="hover:text-[#B5507A]">Blog</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#7C776B]">Conta</p>
              <ul className="space-y-2.5 text-sm text-[#49443D]">
                <li><Link to={REGISTER_URL} className="hover:text-[#B5507A]">Criar conta</Link></li>
                <li><Link to="/login" className="hover:text-[#B5507A]">Entrar</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#7C776B]">Legal</p>
              <ul className="space-y-2.5 text-sm text-[#49443D]">
                <li><Link to="/privacidade" className="hover:text-[#B5507A]">Privacidade</Link></li>
                <li><Link to="/termos" className="hover:text-[#B5507A]">Termos de uso</Link></li>
                <li><Link to="/acessibilidade" className="hover:text-[#B5507A]">Acessibilidade</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-[#F0DDE8] pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#A9A394]">© {new Date().getFullYear()} UseCognia. Todos os direitos reservados.</p>
            <p className="text-xs text-[#A9A394]">Feito para profissionais de saúde e estética no Brasil.</p>
          </div>
        </div>
      </footer>

      {/* ── Mobile sticky CTA ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#F0DDE8] bg-white/95 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden">
        <Link
          to={REGISTER_URL}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#2D1A2E] text-sm font-bold text-white"
        >
          Teste 7 dias grátis <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  )
}
