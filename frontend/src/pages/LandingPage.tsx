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

const trustSignals = [
  'Plano grátis',
  'Para psicólogos, terapeutas e estagiários clínicos',
  'Sem cartão para começar',
]

const pains = [
  {
    title: 'Paciente fica perguntando horário',
    text: 'Quando tudo depende de conversa no WhatsApp, o profissional perde tempo oferecendo datas até encontrar uma opção.',
  },
  {
    title: 'Faltas e cobranças viram constrangimento',
    text: 'Lembretes, confirmações e cobranças manuais quebram o ritmo da clínica e desgastam a relação.',
  },
  {
    title: 'Prontuário e financeiro ficam espalhados',
    text: 'Sessões, histórico, documentos e recebimentos precisam conversar entre si para a rotina não depender de planilhas soltas.',
  },
]

const features = [
  {
    icon: CalendarCheck2,
    title: 'Link público com datas disponíveis',
    text: 'O paciente escolhe uma data real da sua agenda, sem ficar testando dia por dia ou esperando resposta.',
  },
  {
    icon: FileSignature,
    title: 'Prontuário clínico digital',
    text: 'Registre evoluções, acompanhe histórico e mantenha dados clínicos em uma rotina mais segura.',
  },
  {
    icon: WalletCards,
    title: 'Cobranças e recebimentos organizados',
    text: 'Acompanhe pendências, registre pagamentos e envie cobranças de forma mais profissional.',
  },
  {
    icon: MessageSquareText,
    title: 'Mensagens e lembretes',
    text: 'Padronize comunicações importantes e reduza trabalho repetitivo antes e depois das sessões.',
  },
]

const freeItems = [
  'Acesso gratuito sem cartão',
  'Agenda online com link público',
  'Cadastro de até 10 pacientes',
  'Prontuário e evoluções em um só lugar',
  'Ideal para estagiários, psicólogos e terapeutas no início da rotina',
]

const faqs = [
  {
    question: 'Preciso configurar tudo antes de usar?',
    answer: 'Não. Você pode começar pelo essencial: cadastrar pacientes, organizar agenda e registrar evoluções aos poucos.',
  },
  {
    question: 'Quem pode usar o UseCognia?',
    answer: 'Psicólogos, terapeutas e estagiários clínicos no Brasil que querem organizar agenda, pacientes, prontuário e rotina de atendimento.',
  },
  {
    question: 'Meus dados e os dos meus pacientes ficam seguros?',
    answer: 'Sim. Os dados trafegam por HTTPS, senhas são armazenadas com hash seguro e cada profissional acessa apenas seus próprios registros.',
  },
  {
    question: 'Os documentos gerados têm validade?',
    answer: 'Cada PDF gerado pela plataforma recebe um código único e um QR Code de verificação. Qualquer pessoa pode confirmar a autenticidade do documento pelo link público — útil para declarações de comparecimento e outros registros.',
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
    question: 'O plano grátis é realmente gratuito?',
    answer: 'Sim. O plano grátis permite começar sem cartão, com recursos essenciais e limite de até 10 pacientes.',
  },
  {
    question: 'Preciso cadastrar cartão?',
    answer: 'Não para começar no plano grátis. Cartão só é necessário ao contratar um plano pago.',
  },
  {
    question: 'A plataforma é compatível com as normas do CFP?',
    answer: 'A UseCognia foi desenvolvida com atenção às resoluções do Conselho Federal de Psicologia sobre prontuários e registros clínicos. O profissional continua sendo o responsável pelo conteúdo inserido e pelo cumprimento das normas éticas.',
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

const MotionLink = motion(Link)

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full min-w-0 max-w-[calc(100vw-40px)] overflow-hidden rounded-lg border border-white/15 bg-[#17211D] shadow-2xl sm:max-w-[560px]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sage-200">Painel UseCognia</p>
          <p className="mt-1 text-sm text-white/70">Rotina clínica</p>
        </div>
        <span className="shrink-0 rounded-full bg-sage-200 px-3 py-1 text-xs font-semibold text-sage-900">Plano grátis</span>
      </div>

      <div className="grid gap-0 md:grid-cols-[180px_1fr]">
        <aside className="hidden border-r border-white/10 bg-white/[0.03] p-4 md:block">
          {['Dashboard', 'Agenda', 'Pacientes', 'Documentos'].map((item, index) => (
            <div
              key={item}
              className={`mb-2 rounded-md px-3 py-2 text-sm ${index === 1 ? 'bg-sage-500 text-white' : 'text-white/58'}`}
            >
              {item}
            </div>
          ))}
        </aside>

        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
              <p className="text-xs text-white/50">Consultas hoje</p>
              <p className="mt-2 text-2xl font-semibold text-white">4</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
              <p className="text-xs text-white/50">Pendências</p>
              <p className="mt-2 text-2xl font-semibold text-white">2</p>
            </div>
          </div>

          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">Agenda</p>
              <span className="text-xs text-white/45">recorrência ativa</span>
            </div>
            {['09:00 - Ana Paula', '10:00 - Pedro Lima', '14:00 - Marina Costa'].map((item) => (
              <div key={item} className="mb-2 rounded-md bg-[#0D1512] px-3 py-3 text-sm font-medium text-white">
                {item}
              </div>
            ))}
          </div>

          <div className="rounded-md border border-sage-200/25 bg-sage-200/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage-200">Documento pronto</p>
            <p className="mt-1 text-sm text-white">Declaração com QR de autenticidade gerada em uma página.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const { fadeUp, stagger, reduce } = useLandingMotion()
  const { data: publicFeedback } = usePublicTestimonials()
  const realTestimonials = publicFeedback?.items ?? []

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F7F8F5] text-[#211F1C]">
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
            <a href="#grátis" className="hover:text-sage-700">Plano grátis</a>
            <button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-sage-700">Dúvidas</button>
            <Link to="/seguranca" className="hover:text-sage-700">Segurança</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden px-3 py-2 text-sm font-semibold text-[#49443D] hover:text-sage-700 sm:inline-flex">
              Entrar
            </Link>
            <MotionLink
              to="/cadastro"
              whileHover={reduce ? undefined : { scale: 1.03 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              className="hidden rounded-md bg-sage-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sage-900 sm:inline-flex"
            >
              Quero testar
            </MotionLink>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#1D352D] text-white">
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
        <div className="mx-auto grid w-full max-w-6xl min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-10 px-5 py-16 sm:py-20 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:py-24">
          <motion.div
            className="w-full min-w-0 max-w-full sm:max-w-2xl"
            initial="hidden"
            animate="show"
            variants={stagger}
          >
            <motion.p variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-sm font-semibold text-sage-200">
              <Sparkles className="h-4 w-4" />
              Plano grátis para psicólogos, terapeutas e estagiários
            </motion.p>

            <motion.h1 variants={fadeUp} className="mt-6 max-w-[21rem] text-[2.1rem] font-bold leading-[1.06] tracking-normal text-white sm:max-w-2xl sm:text-5xl lg:text-6xl">
              Agenda, prontuário e cobranças para psicólogos e terapeutas trabalharem com menos sobrecarga.
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 max-w-[22rem] text-base leading-relaxed text-white/76 sm:max-w-xl sm:text-lg">
              Organize pacientes, mostre datas disponíveis no link público, registre sessões e acompanhe pagamentos em uma rotina simples de colocar para funcionar.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <MotionLink
                to="/cadastro"
                whileHover={reduce ? undefined : { scale: 1.025 }}
                whileTap={reduce ? undefined : { scale: 0.975 }}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-sage-200 px-5 text-sm font-bold text-sage-900 shadow-lg shadow-sage-200/15 hover:bg-sage-100"
              >
                Começar grátis <ArrowRight className="h-4 w-4" />
              </MotionLink>
              <motion.a
                href="#produto"
                whileHover={reduce ? undefined : { scale: 1.025 }}
                whileTap={reduce ? undefined : { scale: 0.975 }}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/14 bg-white/6 px-5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Ver como funciona <ChevronRight className="h-4 w-4" />
              </motion.a>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-2 text-sm text-white/70 sm:flex-row sm:flex-wrap">
              {trustSignals.map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  <CheckCircle2 className="h-4 w-4 text-sage-200" />
                  {item}
                </span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: reduce ? 0 : 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduce ? 0.01 : 0.7, delay: reduce ? 0 : 0.22, ease: EASE }}
          >
            <ProductPreview />
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
              <p className="text-sm font-semibold text-[#211F1C]">Construído com usuários reais</p>
              <p className="mt-1 text-sm text-[#7C776B]">Criado para a rotina de psicólogos, terapeutas e estagiários clínicos.</p>
            </div>
          </motion.div>
        </div>
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
              A clínica exige presença. Mas a rotina ao redor dela costuma virar uma mistura de WhatsApp, planilha, agenda, caderno, cobranças e lembretes soltos. O UseCognia começa pelo que mais pesa no dia a dia.
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

      <section id="produto" className="border-y border-[#E7E4DA] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <motion.div
            className="max-w-2xl"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">Produto</p>
            <h2 className="mt-3 text-3xl font-bold text-[#211F1C]">O essencial da rotina clínica em um só lugar.</h2>
          </motion.div>

          <motion.div
            className="mt-8 grid gap-4 md:grid-cols-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            {features.map(({ icon: Icon, title, text }) => (
              <motion.article
                key={title}
                variants={fadeUp}
                whileHover={reduce ? undefined : { y: -3 }}
                transition={{ duration: 0.2 }}
                className="rounded-lg border border-[#E7E4DA] bg-[#F7F8F5] p-5 transition-shadow hover:shadow-md"
              >
                <Icon className="mb-4 h-5 w-5 text-sage-600" />
                <h3 className="font-semibold text-[#211F1C]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#7C776B]">{text}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <motion.div
          className="text-center mb-10"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
        >
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">
            {realTestimonials.length >= 3 ? 'Quem usa recomenda' : 'Por que começar agora'}
          </p>
          <h2 className="mt-3 text-3xl font-bold text-[#211F1C]">
            {realTestimonials.length >= 3
              ? 'Psicólogos e terapeutas que já organizaram a rotina com o UseCognia.'
              : 'Uma rotina clínica mais organizada desde o primeiro paciente.'}
          </h2>
        </motion.div>
        <motion.div
          className="grid gap-5 md:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          {(realTestimonials.length >= 3
            ? realTestimonials.slice(0, 3).map(item => ({
                quote: item.text ?? '',
                name: item.firstName,
                role: null,
                initial: item.firstName.charAt(0).toUpperCase(),
                rating: item.rating,
              }))
            : [
                {
                  quote: 'Você começa pelo que mais pesa na rotina: agenda, pacientes, prontuário e documentos em um só lugar.',
                  name: 'Começo simples',
                  role: 'Sem precisar configurar tudo de uma vez',
                  initial: 'A',
                  rating: null,
                },
                {
                  quote: 'O sistema ajuda a reduzir a dependência de caderno, planilha e mensagens soltas no WhatsApp.',
                  name: 'Menos retrabalho',
                  role: 'Mais clareza para operar a clínica',
                  initial: 'P',
                  rating: null,
                },
                {
                  quote: 'Quando a rotina crescer, os planos pagos liberam documentos, automações, instrumentos e IA.',
                  name: 'Cresce com você',
                  role: 'Do plano grátis ao Pro',
                  initial: 'S',
                  rating: null,
                },
              ]
          ).map(({ quote, name, role, initial, rating }) => (
            <motion.figure
              key={name}
              variants={fadeUp}
              whileHover={reduce ? undefined : { y: -3 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-[#E7E4DA] bg-[#FFFFFF] p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              {rating != null && (
                <div className="mb-2 flex gap-0.5" aria-label={`Nota ${rating} de 5`}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} className={`h-3.5 w-3.5 ${n <= rating ? 'fill-sage-500 text-sage-500' : 'text-[#E7E4DA]'}`} />
                  ))}
                </div>
              )}
              <blockquote className="text-sm leading-relaxed text-[#49443D]">"{quote}"</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sm font-bold text-sage-700">
                  {initial}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#211F1C]">{name}</p>
                  {role && <p className="text-xs text-[#7C776B]">{role}</p>}
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </section>

      <section id="grátis" className="mx-auto grid max-w-6xl gap-8 px-5 py-16 lg:grid-cols-[0.9fr_1fr]">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
        >
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">Plano grátis</p>
          <h2 className="mt-3 text-3xl font-bold text-[#211F1C]">Comece sem cartão e organize os primeiros pacientes.</h2>
          <p className="mt-4 max-w-xl leading-relaxed text-[#5F5A51]">
            O plano grátis foi pensado para quem quer sair da bagunça inicial sem assumir custo de imediato. Quando precisar de mais limite ou automação, veja os{' '}
            <Link to="/precos" className="font-semibold text-sage-700 underline underline-offset-2 hover:text-sage-900">planos pagos</Link>.
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
              <p className="text-sm font-semibold text-sage-700">UseCognia Grátis</p>
              <p className="mt-1 text-3xl font-bold text-[#211F1C]">Gratuito</p>
            </div>
            <span className="rounded-full bg-sage-800 px-3 py-1 text-xs font-semibold text-white">sem cartão</span>
          </div>
          <ul className="space-y-3">
            {freeItems.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm font-medium text-[#49443D]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" />
                {item}
              </li>
            ))}
          </ul>
          <MotionLink
            to="/cadastro"
            whileHover={reduce ? undefined : { scale: 1.02 }}
            whileTap={reduce ? undefined : { scale: 0.98 }}
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-sage-800 text-sm font-bold text-white hover:bg-sage-900"
          >
            Começar grátis
          </MotionLink>
          <p className="mt-3 text-center text-xs text-[#A9A394]">Sem cartão. Você pode mudar de plano depois.</p>
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
            Pronto para deixar o consultório com cara de operação profissional?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/70">
            Crie sua conta grátis em menos de dois minutos — sem cartão, sem contrato.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <MotionLink
              to="/cadastro"
              whileHover={reduce ? undefined : { scale: 1.03 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              className="inline-flex h-12 items-center gap-2 rounded-md bg-sage-200 px-6 text-sm font-bold text-sage-900 shadow-lg hover:bg-sage-100"
            >
              Criar conta grátis <ArrowRight className="h-4 w-4" />
            </MotionLink>
            <a
              href="mailto:contato@usecognia.com.br"
              className="inline-flex h-12 items-center gap-2 rounded-md border border-white/20 px-6 text-sm font-semibold text-white hover:bg-white/10"
            >
              Falar com a equipe
            </a>
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
                Agenda, prontuário e cobranças para psicólogos e terapeutas.
              </p>
              <a href="mailto:contato@usecognia.com.br" className="mt-3 block text-sm text-sage-700 hover:underline">
                contato@usecognia.com.br
              </a>
            </div>

            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[#7C776B]">Produto</p>
              <ul className="space-y-2.5 text-sm text-[#49443D]">
                <li><a href="#produto" className="hover:text-sage-700">Funcionalidades</a></li>
                <li><a href="#grátis" className="hover:text-sage-700">Plano grátis</a></li>
                <li><Link to="/precos" className="hover:text-sage-700">Planos pagos</Link></li>
                <li><Link to="/seguranca" className="hover:text-sage-700">Segurança</Link></li>
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
            <p className="text-xs text-[#A9A394]">Desenvolvido para psicólogos, terapeutas e estagiários clínicos no Brasil.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
