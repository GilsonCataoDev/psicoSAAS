import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  FileSignature,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Star,
  WalletCards,
} from 'lucide-react'
import BrandLogo from '@/components/ui/BrandLogo'
import { usePublicTestimonials } from '@/hooks/api/testimonial'
import { track, EVENTS } from '@/lib/analytics'
import { councilLabel } from '@/lib/professions'

const trustSignals = [
  'Feito para profissionais de saúde',
  'Dados protegidos com criptografia',
  '7 dias de teste com acesso completo',
  'Cancele antes do vencimento',
]

const pains = [
  {
    title: 'Quantas horas por semana você perde remarcando sessões no WhatsApp?',
    text: 'Disponibilize seus horários em um link público e deixe o paciente escolher entre as opções que você liberou.',
  },
  {
    title: 'Quanto você deixa de receber por não acompanhar cobranças e pagamentos?',
    text: 'Visualize valores pendentes e recebidos sem depender de planilhas, anotações ou memória.',
  },
  {
    title: 'Quantos pacientes você precisa lembrar manualmente antes de cada consulta?',
    text: 'Centralize agenda, confirmações e histórico para reduzir tarefas repetitivas e evitar informações espalhadas.',
  },
]

const howItWorks = [
  {
    step: '1',
    title: 'Crie sua conta',
    text: 'Informe seus dados profissionais e entre no sistema em menos de dois minutos.',
  },
  {
    step: '2',
    title: 'Cadastre o primeiro paciente',
    text: 'Organize contato, histórico, sessões e documentos em uma ficha única.',
  },
  {
    step: '3',
    title: 'Centralize sua rotina',
    text: 'Use agenda, prontuário e financeiro juntos, sem precisar configurar tudo de uma vez.',
  },
]

const features = [
  {
    icon: CalendarCheck2,
    title: 'Link público com datas disponíveis',
    text: 'O paciente escolhe uma data real da sua agenda, sem ficar testando dia por dia ou esperando resposta.',
    accent: 'text-sky-600 bg-sky-50',
  },
  {
    icon: FileSignature,
    title: 'Prontuário clínico digital',
    text: 'Registre evoluções, acompanhe histórico e mantenha dados clínicos em uma rotina mais segura.',
    accent: 'text-sage-600 bg-sage-50',
  },
  {
    icon: WalletCards,
    title: 'Cobranças e recebimentos organizados',
    text: 'Acompanhe pendências, registre pagamentos e envie cobranças de forma mais profissional.',
    accent: 'text-amber-600 bg-amber-50',
  },
  {
    icon: MessageSquareText,
    title: 'Mensagens e lembretes',
    text: 'Padronize comunicações importantes e reduza trabalho repetitivo antes e depois das sessões.',
    accent: 'text-purple-600 bg-purple-50',
  },
]

const trialItems = [
  '7 dias com acesso completo ao plano Pro',
  'Agenda online com link público de agendamento',
  'Pacientes ilimitados durante o teste',
  'Prontuário, documentos e financeiro incluídos',
  'WhatsApp, IA e cobranças quando configurados',
]

const faqs = [
  {
    question: 'Preciso configurar tudo antes de usar?',
    answer: 'Não. Você pode começar pelo essencial: cadastrar pacientes, organizar agenda e registrar evoluções aos poucos.',
  },
  {
    question: 'Quem pode usar o UseCognia?',
    answer: 'Profissionais de saúde autônomos no Brasil — psicologia, nutrição, fisioterapia, fonoaudiologia, terapia ocupacional, odontologia e afins — que querem organizar agenda, pessoas atendidas, registros e rotina de atendimento. Os termos e os recursos da plataforma se ajustam à profissão escolhida no cadastro.',
  },
  {
    question: 'Meus dados e os dos meus pacientes ficam seguros?',
    answer: 'O UseCognia aplica HTTPS, hash seguro de senhas, controle de acesso e isolamento entre contas. Nenhum sistema é absolutamente seguro; consulte a página de Segurança para conhecer os controles e limites.',
  },
  {
    question: 'Como os documentos podem ser verificados?',
    answer: 'Cada PDF gerado pela plataforma recebe um código único e um QR Code de verificação. O link confirma a integridade e a origem no UseCognia, mas não substitui assinatura qualificada, requisitos legais ou a responsabilidade do profissional.',
  },
  {
    question: 'O paciente precisa instalar aplicativo?',
    answer: 'Não. A proposta é que links públicos e páginas de confirmação abram direto no navegador do celular ou computador.',
  },
  {
    question: 'Posso usar se atendo online e presencialmente?',
    answer: 'Sim. A agenda e os agendamentos públicos permitem configurar modalidades separadas — presencial e online — com disponibilidades e horários distintos para cada uma.',
  },
  {
    question: 'O teste de 7 dias é realmente gratuito?',
    answer: 'Sim. Nenhum valor é cobrado durante os 7 dias de teste. Cancele antes do vencimento e não haverá cobrança.',
  },
  {
    question: 'Preciso cadastrar cartão?',
    answer: 'Sim. O cartão é necessário no cadastro para iniciar o teste. Isso garante a continuidade do serviço após o período gratuito caso você opte por continuar.',
  },
  {
    question: 'A plataforma atende às normas do meu conselho?',
    answer: 'O UseCognia oferece recursos de organização, controle de acesso e registro que apoiam a rotina de qualquer profissional de saúde. Cada conselho — CFP, CFN, COFFITO, CFO e afins — tem suas próprias resoluções, e a adequação de cada documento e atendimento às normas aplicáveis continua sob responsabilidade do profissional.',
  },
  {
    question: 'Consigo emitir declarações e atestados em PDF?',
    answer: 'Sim. A plataforma gera declarações de comparecimento, atestados e outros documentos em PDF formatado, com dados do profissional, do paciente e código de verificação. O documento pode ser impresso ou enviado digitalmente.',
  },
]

// Curva expo-out — entrada rápida no início, assentamento suave no final.
// É a mesma sensação usada em produtos como Linear/Vercel para reveals de marketing.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

function useLandingMotion() {
  const reduce = useReducedMotion()

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 16 },
    show: { opacity: 1, y: 0, transition: { duration: reduce ? 0.01 : 0.55, ease: EASE } },
  }

  const stagger: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : 0.09, delayChildren: reduce ? 0 : 0.04 },
    },
  }

  return { fadeUp, stagger, reduce }
}

const MotionLink = motion.create(Link)

const productViews = [
  { id: 'agenda', label: 'Agenda', icon: CalendarCheck2 },
  { id: 'prontuario', label: 'Prontuário', icon: FileSignature },
  { id: 'financeiro', label: 'Financeiro', icon: WalletCards },
  { id: 'documentos', label: 'Documentos', icon: ShieldCheck },
] as const

type ProductView = typeof productViews[number]['id']

function ProductPreview() {
  const [activeView, setActiveView] = useState<ProductView>('agenda')
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const selectAdjacentTab = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % productViews.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + productViews.length) % productViews.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = productViews.length - 1
    if (nextIndex === null) return
    event.preventDefault()
    setActiveView(productViews[nextIndex].id)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <div className="relative mx-auto w-full min-w-0 max-w-[calc(100vw-40px)] overflow-hidden rounded-xl border border-white/15 bg-[#17211D] shadow-2xl sm:max-w-[620px]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sage-200">Painel UseCognia</p>
          <p className="mt-1 text-sm text-white/70">Demonstração com dados fictícios</p>
        </div>
        <span className="shrink-0 rounded-full bg-sage-200 px-3 py-1 text-xs font-semibold text-sage-900">Produto em ação</span>
      </div>

      <div className="border-b border-white/10 bg-white/[0.03] p-2">
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4" role="tablist" aria-label="Conheça as áreas do UseCognia">
          {productViews.map(({ id, label, icon: Icon }, index) => (
            <button
              key={id}
              ref={element => { tabRefs.current[index] = element }}
              id={`product-preview-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={activeView === id}
              aria-controls="product-preview-panel"
              tabIndex={activeView === id ? 0 : -1}
              onClick={() => setActiveView(id)}
              onKeyDown={event => selectAdjacentTab(event, index)}
              className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm ${activeView === id ? 'bg-sage-200 text-[#143D2D]' : 'text-white/65 hover:bg-white/8 hover:text-white'}`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div id="product-preview-panel" role="tabpanel" aria-labelledby={`product-preview-tab-${activeView}`} className="min-h-[330px] space-y-4 p-4 sm:p-5">
        {activeView === 'agenda' && <AgendaPreview />}
        {activeView === 'prontuario' && <ProntuarioPreview />}
        {activeView === 'financeiro' && <FinancialPreview />}
        {activeView === 'documentos' && <DocumentsPreview />}
      </div>
    </div>
  )
}

function PreviewHeader({ title, detail }: { title: string; detail: string }) {
  return <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-white">{title}</p><span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/55">{detail}</span></div>
}

function AgendaPreview() {
  return <>
    <PreviewHeader title="Agenda da semana" detail="4 atendimentos hoje" />
    <div className="grid grid-cols-3 gap-2 text-center text-xs text-white/45"><span>09:00</span><span>10:00</span><span>14:00</span></div>
    <div className="grid grid-cols-3 gap-2">
      {['Confirmada', 'Online', 'A confirmar'].map((status, index) => <div key={status} className={`min-h-28 rounded-lg border p-3 ${index === 2 ? 'border-amber-300/25 bg-amber-200/10' : 'border-sage-200/20 bg-sage-200/10'}`}><span className="text-xs text-white/55">Sessão {index + 1}</span><p className="mt-3 text-sm font-semibold text-white">Paciente demonstrativo</p><p className="mt-2 text-xs text-sage-200">{status}</p></div>)}
    </div>
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-white/70">Link público respeita apenas os horários liberados pelo profissional.</div>
  </>
}

function ProntuarioPreview() {
  return <>
    <PreviewHeader title="Ficha clínica organizada" detail="salvamento automático" />
    <div className="grid gap-3 sm:grid-cols-[0.65fr_1.35fr]">
      <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.04] p-3">{['Histórico', 'Sessões', 'Documentos', 'Instrumentos'].map((item, index) => <div key={item} className={`rounded-md px-3 py-2 text-sm ${index === 1 ? 'bg-sage-200 text-[#143D2D]' : 'text-white/60'}`}>{item}</div>)}</div>
      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4"><p className="text-xs font-semibold uppercase tracking-wider text-sage-200">Evolução da sessão</p><div className="mt-4 space-y-2">{[92, 84, 68, 76].map(width => <div key={width} className="h-2 rounded-full bg-white/10" style={{ width: `${width}%` }} />)}</div><div className="mt-7 flex items-center justify-between border-t border-white/10 pt-3 text-xs"><span className="text-white/45">Conteúdo demonstrativo</span><span className="text-sage-200">Salvo</span></div></div>
    </div>
  </>
}

function FinancialPreview() {
  return <>
    <PreviewHeader title="Visão financeira" detail="mês atual" />
    <div className="grid grid-cols-2 gap-3"><div className="rounded-lg border border-sage-200/20 bg-sage-200/10 p-4"><p className="text-xs text-white/50">Recebido</p><p className="mt-2 text-2xl font-semibold text-white">R$ 2.450</p></div><div className="rounded-lg border border-amber-200/20 bg-amber-200/10 p-4"><p className="text-xs text-white/50">Pendente</p><p className="mt-2 text-2xl font-semibold text-white">R$ 380</p></div></div>
    <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.04] p-3">{[['Sessão demonstrativa', 'Recebido'], ['Pacote mensal', 'Pendente'], ['Sessão online', 'Recebido']].map(([item, status]) => <div key={item} className="flex items-center justify-between gap-3 rounded-md bg-black/15 px-3 py-2.5 text-sm"><span className="text-white/70">{item}</span><span className={status === 'Recebido' ? 'text-sage-200' : 'text-amber-200'}>{status}</span></div>)}</div>
  </>
}

function DocumentsPreview() {
  return <>
    <PreviewHeader title="Documentos profissionais" detail="PDF verificável" />
    <div className="grid gap-3 sm:grid-cols-2">{['Declaração de comparecimento', 'Atestado psicológico'].map((item, index) => <div key={item} className="rounded-lg border border-white/10 bg-white/[0.04] p-4"><FileSignature className="h-7 w-7 text-sage-200" /><p className="mt-4 text-sm font-semibold text-white">{item}</p><p className="mt-2 text-xs leading-relaxed text-white/50">Modelo preenchido pelo profissional e exportado em PDF.</p><div className="mt-4 flex items-center gap-2 text-xs text-sage-200"><ShieldCheck className="h-4 w-4" /> {index === 0 ? 'Código de verificação' : 'QR Code de autenticidade'}</div></div>)}</div>
    <div className="rounded-lg border border-sage-200/25 bg-sage-200/10 p-3 text-sm text-white/75">O código confirma origem e integridade do arquivo; a responsabilidade técnica continua com o profissional.</div>
  </>
}

export default function LandingPage() {
  const { fadeUp, stagger, reduce } = useLandingMotion()
  const { data: publicFeedback } = usePublicTestimonials()
  const realTestimonials = publicFeedback?.items ?? []
  const signupPath = `/cadastro${window.location.search}`

  useEffect(() => {
    // A landing tem uma paleta própria, predominantemente clara. O tema escuro
    // global do painel remapeia utilitários como bg-white e text-sage-700,
    // causando texto claro sobre seções claras nesta página pública.
    const html = document.documentElement
    const wasDark = html.classList.contains('dark')
    html.classList.remove('dark')

    track(EVENTS.LANDING_VIEWED, {
      path: window.location.pathname,
      source: new URLSearchParams(window.location.search).get('utm_source') ?? 'direct',
    })

    return () => {
      if (wasDark) html.classList.add('dark')
    }
  }, [])

  useEffect(() => {
    const schemaId = 'usecognia-live-rating-schema'
    document.getElementById(schemaId)?.remove()
    if (!publicFeedback?.count || !publicFeedback.averageRating) return

    const script = document.createElement('script')
    script.id = schemaId
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      '@id': 'https://usecognia.com.br/#software',
      name: 'UseCognia',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: publicFeedback.averageRating,
        ratingCount: publicFeedback.count,
        bestRating: 5,
        worstRating: 1,
      },
    })
    document.head.appendChild(script)
    return () => script.remove()
  }, [publicFeedback?.averageRating, publicFeedback?.count])

  return (
    <main className="landing-readable min-h-screen overflow-x-hidden bg-[#F7F8F5] pb-16 text-[#211F1C] sm:pb-0">
      <header className="sticky top-0 z-20 border-b border-[#E7E4DA] bg-[#F7F8F5]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
          <Link to="/inicio" className="flex min-w-0 items-center gap-2.5">
            <BrandLogo compact className="shrink-0" />
            <span className="text-xl font-bold tracking-tight text-[#211F1C]">
              Use<span className="text-[#2F7657]">Cognia</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#5F5A51] md:flex">
            <a href="#produto" className="hover:text-sage-700">Produto</a>
            <a href="#teste" className="hover:text-sage-700">Teste grátis</a>
            <button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-sage-700">Dúvidas</button>
            <Link to="/blog" className="hover:text-sage-700">Blog</Link>
            <Link to="/seguranca" className="hover:text-sage-700">Segurança</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden px-3 py-2 text-sm font-semibold text-[#49443D] hover:text-sage-700 sm:inline-flex">
              Entrar
            </Link>
            <MotionLink
              to={signupPath}
              onClick={() => track(EVENTS.LANDING_CTA_CLICKED, { location: 'header', destination: 'signup' })}
              whileHover={reduce ? undefined : { scale: 1.03 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              className="hidden rounded-md bg-sage-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sage-900 sm:inline-flex"
            >
              Criar conta grátis
            </MotionLink>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#1D352D] text-white">
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
        <div className="mx-auto w-full max-w-4xl px-5 py-16 text-center sm:py-20 lg:py-24">
          <motion.div
            className="mx-auto w-full max-w-4xl"
            initial="hidden"
            animate="show"
            variants={stagger}
          >
            <motion.p variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-sm font-semibold text-sage-200">
              <Sparkles className="h-4 w-4" />
              Gestão clínica para profissionais de saúde
            </motion.p>

            <motion.h1 variants={fadeUp} className="mx-auto mt-6 max-w-[22rem] text-[2.1rem] font-bold leading-[1.06] tracking-normal text-white sm:max-w-4xl sm:text-5xl lg:text-6xl">
              Sua clínica organizada. Mais tempo para cuidar de quem importa.
            </motion.h1>

            <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-[23rem] text-base leading-relaxed text-white/80 sm:max-w-2xl sm:text-lg">
              Agenda, pacientes, prontuário e financeiro em um só lugar. Experimente 7 dias grátis com acesso completo.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-col items-center gap-3">
              <MotionLink
                to={signupPath}
                onClick={() => track(EVENTS.LANDING_CTA_CLICKED, { location: 'hero', destination: 'signup' })}
                whileHover={reduce ? undefined : { scale: 1.025 }}
                whileTap={reduce ? undefined : { scale: 0.975 }}
                className="inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-md bg-[#CFF3DE] px-6 text-sm font-bold text-[#143D2D] shadow-lg shadow-black/15 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Começar 7 dias grátis <ArrowRight className="h-4 w-4" />
              </MotionLink>
              <span className="text-sm text-white/75">Leva menos de 2 minutos</span>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-7 flex flex-col justify-center gap-2 text-sm text-white/80 sm:flex-row sm:flex-wrap">
              {trustSignals.map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  <CheckCircle2 className="h-4 w-4 text-sage-200" />
                  {item}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      <motion.section
        className="border-b border-[#E7E4DA] bg-[#FFFFFF]"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
      >
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-3">
          <motion.div variants={fadeUp} className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-sage-600" />
            <div>
              <p className="text-sm font-semibold text-[#211F1C]">Privacidade visível</p>
              <p className="mt-1 text-sm text-[#7C776B]">Dados clínicos tratados com cuidado desde a base do produto.</p>
            </div>
          </motion.div>
          <motion.div variants={fadeUp} className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 text-sage-600" />
            <div>
              <p className="text-sm font-semibold text-[#211F1C]">Verificação pública</p>
              <p className="mt-1 text-sm text-[#7C776B]">Cada documento pode ser validado por link e código único.</p>
            </div>
          </motion.div>
          <motion.div variants={fadeUp} className="flex items-start gap-3">
            <WalletCards className="mt-0.5 h-5 w-5 text-sage-600" />
            <div>
              <p className="text-sm font-semibold text-[#211F1C]">Construído com feedback profissional</p>
              <p className="mt-1 text-sm text-[#7C776B]">Criado a partir de conversas sobre a rotina de quem atende todos os dias.</p>
            </div>
          </motion.div>
        </div>
        {realTestimonials.length > 0 && (
          <div className="mx-auto max-w-6xl px-5 pb-10">
            <div className="mb-5 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">Quem usa recomenda</p>
              {publicFeedback?.averageRating && <p className="mt-2 text-sm text-[#6D675D]"><strong className="text-[#211F1C]">{publicFeedback.averageRating.toLocaleString('pt-BR')}/5</strong> em {publicFeedback.count} avaliação{publicFeedback.count === 1 ? '' : 'ões'} publicada{publicFeedback.count === 1 ? '' : 's'}</p>}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {realTestimonials.slice(0, 3).map(item => (
                <motion.figure
                  key={`${item.firstName}-${item.text}`}
                  variants={fadeUp}
                  className="rounded-xl border border-[#E7E4DA] bg-[#F7F8F5] p-5"
                >
                  <div className="mb-3 flex gap-0.5" aria-label={`Nota ${item.rating ?? 0} de 5`}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} className={`h-3.5 w-3.5 ${n <= (item.rating ?? 0) ? 'fill-sage-600 text-sage-600' : 'text-[#D6D1C5]'}`} />
                    ))}
                  </div>
                  <blockquote className="text-sm leading-relaxed text-[#49443D]">“{item.text}”</blockquote>
                  <figcaption className="mt-4 flex items-center gap-3">
                    {item.avatarUrl ? <img src={item.avatarUrl} alt="" loading="lazy" className="h-10 w-10 rounded-full object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-100 text-sm font-bold text-sage-800">{(item.displayName || item.firstName).slice(0, 1).toUpperCase()}</span>}
                    <span className="min-w-0">
                      <strong className="block truncate text-sm text-[#211F1C]">{item.displayName || item.firstName}</strong>
                      <span className="block text-xs text-[#6D675D]">{[item.specialty, item.crp ? `${councilLabel(item.profession)} ${item.crp}` : null, item.city].filter(Boolean).join(' · ') || 'Profissional usuário do UseCognia'}</span>
                    </span>
                  </figcaption>
                </motion.figure>
              ))}
            </div>
          </div>
        )}
      </motion.section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1fr]">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">Por que agora</p>
            <h2 className="mt-3 text-3xl font-bold text-[#211F1C]">Você não estudou para virar administrador de agenda.</h2>
            <p className="mt-4 leading-relaxed text-[#5F5A51]">
              Seu trabalho precisa de presença e atenção. Quando agenda, lembretes, registros e pagamentos ficam espalhados, a burocracia ocupa o tempo que deveria voltar para você e seus pacientes.
            </p>
          </motion.div>
          <motion.div
            className="grid gap-3"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            {pains.map((item) => (
              <motion.article
                key={item.title}
                variants={fadeUp}
                whileHover={reduce ? undefined : { y: -3 }}
                transition={{ duration: 0.2 }}
                className="rounded-lg border border-[#E7E4DA] bg-[#FFFFFF] p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <h3 className="font-semibold text-[#211F1C]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#7C776B]">{item.text}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="border-y border-[#E7E4DA] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">Antes e depois</p>
            <h2 className="mt-3 text-3xl font-bold text-[#211F1C]">Troque tarefas espalhadas por um fluxo que se conecta.</h2>
          </motion.div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-6">
              <p className="text-sm font-bold uppercase tracking-wide text-rose-700">Sem o UseCognia</p>
              <ul className="mt-4 space-y-3 text-sm text-[#5F5A51]">
                {['Horários negociados por mensagem', 'Anotações em caderno ou arquivos separados', 'Pagamentos conferidos de memória', 'Documentos montados manualmente'].map(item => (
                  <li key={item} className="flex gap-3"><span aria-hidden="true" className="text-rose-500">×</span>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-sage-200 bg-sage-50/70 p-6">
              <p className="text-sm font-bold uppercase tracking-wide text-sage-800">Com o UseCognia</p>
              <ul className="mt-4 space-y-3 text-sm font-medium text-[#49443D]">
                {['Link público ligado à sua disponibilidade', 'Histórico do paciente e evoluções juntos', 'Pendências e recebimentos visíveis', 'Documentos em PDF com código de verificação'].map(item => (
                  <li key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" />{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="produto" className="border-y border-[#E7E4DA] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <motion.div
            className="max-w-2xl"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">Produto em ação</p>
            <h2 className="mt-3 text-3xl font-bold text-[#211F1C]">Conheça o fluxo antes de criar sua conta.</h2>
            <p className="mt-4 leading-relaxed text-[#5F5A51]">
              Você começa pelo essencial e adiciona recursos conforme sua clínica precisar.
            </p>
          </motion.div>

          <div className="mt-10 grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <ProductPreview />
            <motion.ol
              className="space-y-4"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
            >
              {howItWorks.map(item => (
                <motion.li key={item.step} variants={fadeUp} className="flex gap-4 rounded-lg border border-[#E7E4DA] bg-[#F7F8F5] p-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-800 text-sm font-bold text-white">
                    {item.step}
                  </span>
                  <div>
                    <h3 className="font-semibold text-[#211F1C]">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#6D675D]">{item.text}</p>
                  </div>
                </motion.li>
              ))}
            </motion.ol>
          </div>

          <motion.div
            className="mt-10 grid gap-4 md:grid-cols-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            {features.map(({ icon: Icon, title, text, accent }) => (
              <motion.article
                key={title}
                variants={fadeUp}
                whileHover={reduce ? undefined : { y: -3 }}
                transition={{ duration: 0.2 }}
                className="rounded-lg border border-[#E7E4DA] bg-[#F7F8F5] p-5 transition-shadow hover:shadow-md"
              >
                <span className={`mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold text-[#211F1C]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#7C776B]">{text}</p>
              </motion.article>
            ))}
          </motion.div>

          <div className="mt-8 text-center">
            <a href="#teste" className="inline-flex items-center gap-2 text-sm font-semibold text-sage-800 underline underline-offset-4 hover:text-sage-950">
              Ver o que está incluído no teste grátis <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section id="teste" className="mx-auto grid max-w-6xl gap-8 px-5 py-16 lg:grid-cols-[0.9fr_1fr]">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
        >
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">7 dias grátis</p>
          <h2 className="mt-3 text-3xl font-bold text-[#211F1C]">Experimente tudo por 7 dias antes de pagar.</h2>
          <p className="mt-4 max-w-xl leading-relaxed text-[#5F5A51]">
            Acesso completo ao plano Pro durante o período de teste. Cancele antes do vencimento e nenhum valor será cobrado. Após os 7 dias, a assinatura é de{' '}
            <Link to="/precos" className="font-semibold text-sage-700 underline underline-offset-2 hover:text-sage-900">R$97,90/mês</Link>.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          className="rounded-lg border border-sage-200 bg-[#FFFFFF] p-6 shadow-card"
        >
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-sage-700">UseCognia Pro — Teste</p>
              <p className="mt-1 text-3xl font-bold text-[#211F1C]">7 dias grátis</p>
            </div>
            <span className="rounded-full bg-sage-800 px-3 py-1 text-xs font-semibold text-white">acesso completo</span>
          </div>
          <ul className="space-y-3">
            {trialItems.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm font-medium text-[#49443D]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" />
                {item}
              </li>
            ))}
          </ul>
          <MotionLink
            to={signupPath}
            onClick={() => track(EVENTS.LANDING_CTA_CLICKED, { location: 'trial_plan', destination: 'signup' })}
            whileHover={reduce ? undefined : { scale: 1.02 }}
            whileTap={reduce ? undefined : { scale: 0.98 }}
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-sage-800 text-sm font-bold text-white hover:bg-sage-900"
          >
            Começar 7 dias grátis
          </MotionLink>
          <p className="mt-3 text-center text-xs text-[#6D675D]">Leva menos de 2 minutos · cancele antes do vencimento</p>
        </motion.div>
      </section>

      <section id="faq" className="border-y border-[#E7E4DA] bg-[#FFFFFF]">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <motion.div
            className="text-center mb-10"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">Dúvidas frequentes</p>
            <h2 className="mt-3 text-3xl font-bold text-[#211F1C]">Perguntas antes de começar</h2>
          </motion.div>
          <motion.div
            className="divide-y divide-[#E7E4DA]"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            {faqs.map((item) => (
              <motion.details key={item.question} variants={fadeUp} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span className="font-semibold text-[#211F1C] group-open:text-sage-900">{item.question}</span>
                  <span className="shrink-0 text-[#7C776B] text-lg leading-none group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[#7C776B]">{item.answer}</p>
              </motion.details>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="bg-[#1D352D] px-5 py-20 text-white">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
        >
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-200">Comece hoje</p>
          <h2 className="mt-4 text-3xl font-bold leading-snug">
            Configure sua conta em 5 minutos e organize seu primeiro paciente hoje.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/80">
            Comece com agenda, pacientes, prontuário e financeiro reunidos em uma rotina mais leve.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <MotionLink
              to={signupPath}
              onClick={() => track(EVENTS.LANDING_CTA_CLICKED, { location: 'final', destination: 'signup' })}
              whileHover={reduce ? undefined : { scale: 1.03 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              className="inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-md bg-[#CFF3DE] px-6 text-sm font-bold text-[#143D2D] shadow-lg hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Criar minha conta grátis <ArrowRight className="h-4 w-4" />
            </MotionLink>
            <p className="text-sm text-white/75">7 dias grátis · acesso completo · cancele antes do vencimento</p>
            <div className="mt-2 flex justify-center gap-4 text-sm text-white/60">
              <Link to="/acessibilidade" className="hover:text-white">Acessibilidade</Link>
              <Link to="/privacidade" className="hover:text-white">Privacidade</Link>
              <Link to="/termos" className="hover:text-white">Termos</Link>
            </div>
          </div>
        </motion.div>
      </section>

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
              <a href="mailto:usecognia@gmail.com" className="mt-3 block text-sm text-sage-700 hover:underline">
                usecognia@gmail.com
              </a>
            </div>

            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#7C776B]">Produto</p>
              <ul className="space-y-2.5 text-sm text-[#49443D]">
                <li><a href="#produto" className="hover:text-sage-700">Funcionalidades</a></li>
                <li><a href="#teste" className="hover:text-sage-700">Teste grátis</a></li>
                <li><Link to="/precos" className="hover:text-sage-700">Planos pagos</Link></li>
                <li><Link to="/seguranca" className="hover:text-sage-700">Segurança</Link></li>
                <li><Link to="/blog" className="hover:text-sage-700">Blog</Link></li>
              </ul>
            </div>

            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#7C776B]">Conta</p>
              <ul className="space-y-2.5 text-sm text-[#49443D]">
                <li><Link to="/cadastro" className="hover:text-sage-700">Criar conta</Link></li>
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

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#D9D5C9] bg-white/95 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden">
        <Link
          to={signupPath}
          onClick={() => track(EVENTS.LANDING_CTA_CLICKED, { location: 'mobile_sticky', destination: 'signup' })}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-sage-800 text-sm font-bold text-white"
        >
          Criar conta grátis <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  )
}
