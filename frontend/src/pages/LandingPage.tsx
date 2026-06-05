import { Link } from 'react-router-dom'
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
  WalletCards,
} from 'lucide-react'
import BrandLogo from '@/components/ui/BrandLogo'

const trustSignals = [
  'Teste grátis por 7 dias',
  'Documentos com verificação digital',
  'Privacidade e LGPD no centro',
]

const pains = [
  {
    title: 'Agenda espalhada',
    text: 'Horários fixos, recorrências e pedidos de agendamento deixam de depender de mensagens soltas.',
  },
  {
    title: 'Documento com cara de rascunho',
    text: 'PDFs ganham assinatura, código de verificação e apresentação profissional.',
  },
  {
    title: 'Cobrança manual demais',
    text: 'Pendências, links de pagamento e lembretes ficam visíveis antes de virar esquecimento.',
  },
]

const features = [
  {
    icon: CalendarCheck2,
    title: 'Agenda clínica',
    text: 'Sessões únicas ou recorrentes, bloqueios, modalidade e link público de agendamento.',
  },
  {
    icon: FileSignature,
    title: 'Documentos e prontuário',
    text: 'Declarações, recibos, relatórios e registros clínicos com aparência oficial.',
  },
  {
    icon: WalletCards,
    title: 'Financeiro do consultório',
    text: 'Recebidos, pendentes, atrasados e links de pagamento organizados por pessoa.',
  },
  {
    icon: MessageSquareText,
    title: 'Mensagens inteligentes',
    text: 'Modelos e automações para reduzir tarefas repetitivas sem perder o tom humano.',
  },
]

const proItems = [
  'Pacientes e documentos ilimitados',
  'Links de pagamento e cartão via Asaas',
  'Mensagens e lembretes automáticos',
  'Relatórios para acompanhar crescimento',
  'Recursos para rotina profissional completa',
]

const faqs = [
  {
    question: 'Preciso configurar tudo antes de usar?',
    answer: 'Não. Você começa pelo que precisar — agenda, pacientes ou documentos. Cada funcionalidade pode ser ativada no seu próprio tempo, sem obrigar uma configuração completa.',
  },
  {
    question: 'Serve para psicólogo que atende sozinho?',
    answer: 'Sim, e é exatamente para esse perfil que a plataforma foi pensada. Consultório individual que precisa de organização profissional sem estrutura de clínica grande.',
  },
  {
    question: 'Meus dados e os dos meus pacientes ficam seguros?',
    answer: 'Sim. Os dados trafegam por HTTPS, senhas são armazenadas com criptografia, cada profissional acessa apenas seus próprios registros e o sistema segue as diretrizes da LGPD. Você é o controlador dos dados dos seus pacientes.',
  },
  {
    question: 'Os documentos gerados têm validade?',
    answer: 'Cada PDF gerado pela plataforma recebe um código único e um QR Code de verificação. Qualquer pessoa pode confirmar a autenticidade do documento pelo link público — útil para declarações de comparecimento e outros registros.',
  },
  {
    question: 'O paciente precisa instalar algum aplicativo?',
    answer: 'Não. O link de agendamento, as confirmações e as verificações de documentos abrem direto no navegador do celular ou computador do paciente.',
  },
  {
    question: 'Posso usar se atendo online e presencialmente?',
    answer: 'Sim. A agenda e os agendamentos públicos permitem configurar modalidades separadas — presencial e online — com disponibilidades e horários distintos para cada uma.',
  },
  {
    question: 'O que acontece com meus dados se eu cancelar?',
    answer: 'Antes de cancelar você pode exportar todos os seus dados — pacientes, prontuários, histórico financeiro e documentos. Após o encerramento, os dados são removidos dos servidores ativos em até 30 dias, conforme nossa Política de Privacidade.',
  },
  {
    question: 'Há período de teste gratuito?',
    answer: 'Sim. Ao criar conta você tem 7 dias para explorar a plataforma sem precisar cadastrar cartão. Você vê se combina com sua rotina antes de qualquer cobrança.',
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

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full min-w-0 max-w-[calc(100vw-40px)] overflow-hidden rounded-lg border border-white/15 bg-[#111827] shadow-2xl sm:max-w-[560px]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9BE7C1]">Painel UseCognia</p>
          <p className="mt-1 text-sm text-white/70">Hoje, 02 de junho</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#9BE7C1] px-3 py-1 text-xs font-semibold text-[#102019]">Pro ativo</span>
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
              <div key={item} className="mb-2 rounded-md bg-[#0B1020] px-3 py-3 text-sm font-medium text-white">
                {item}
              </div>
            ))}
          </div>

          <div className="rounded-md border border-[#9BE7C1]/25 bg-[#9BE7C1]/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9BE7C1]">Documento pronto</p>
            <p className="mt-1 text-sm text-white">Declaração com QR de autenticidade gerada em uma página.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F7F8F5] text-[#211F1C]">
      <header className="sticky top-0 z-20 border-b border-[#E7E4DA] bg-[#F7F8F5]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
          <Link to="/inicio" className="flex min-w-0 items-center gap-2.5">
            <BrandLogo compact className="shrink-0" />
            <span className="text-xl font-bold tracking-tight text-[#211F1C]">
              Use<span className="text-[#5B3EFF]">Cognia</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#5F5A51] md:flex">
            <a href="#produto" className="hover:text-sage-700">Produto</a>
            <a href="#pro" className="hover:text-sage-700">Plano Pro</a>
            <button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-sage-700">Dúvidas</button>
            <Link to="/seguranca" className="hover:text-sage-700">Seguranca</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden px-3 py-2 text-sm font-semibold text-[#49443D] hover:text-sage-700 sm:inline-flex">
              Entrar
            </Link>
            <Link to="/cadastro" className="hidden rounded-md bg-sage-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sage-900 sm:inline-flex">
              Começar
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#0E1324] text-white">
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
        <div className="mx-auto grid w-full max-w-6xl min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-10 px-5 py-16 sm:py-20 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:py-24">
          <div className="w-full min-w-0 max-w-full sm:max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-sm font-semibold text-[#B8F2D0]">
              <Sparkles className="h-4 w-4" />
              SaaS para psicólogos brasileiros
            </p>

            <h1 className="mt-6 max-w-[21rem] text-[2.1rem] font-bold leading-[1.06] tracking-normal text-white sm:max-w-2xl sm:text-5xl lg:text-6xl">
              O consultório organizado antes da próxima sessão.
            </h1>

            <p className="mt-6 max-w-[22rem] text-base leading-relaxed text-white/76 sm:max-w-xl sm:text-lg">
              Agenda, pacientes, documentos, financeiro e lembretes em uma experiência feita para psicólogos que querem profissionalizar a rotina sem complicar.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/cadastro"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#9BE7C1] px-5 text-sm font-bold text-[#102019] shadow-lg shadow-[#9BE7C1]/15 hover:bg-[#B8F2D0]"
              >
                Testar 7 dias grátis <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#produto"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/14 bg-white/6 px-5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Ver como funciona <ChevronRight className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-8 flex flex-col gap-2 text-sm text-white/70 sm:flex-row sm:flex-wrap">
              {trustSignals.map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#9BE7C1]" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <ProductPreview />
        </div>
      </section>

      <section className="border-b border-[#E7E4DA] bg-[#FFFFFF]">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-sage-600" />
            <div>
              <p className="text-sm font-semibold text-[#211F1C]">Privacidade visível</p>
              <p className="mt-1 text-sm text-[#7C776B]">Mensagens, documentos e dados sensíveis tratados com cuidado.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 text-sage-600" />
            <div>
              <p className="text-sm font-semibold text-[#211F1C]">Verificação pública</p>
              <p className="mt-1 text-sm text-[#7C776B]">Cada documento pode ser validado por link e código único.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <WalletCards className="mt-0.5 h-5 w-5 text-sage-600" />
            <div>
              <p className="text-sm font-semibold text-[#211F1C]">Cobrança integrada</p>
              <p className="mt-1 text-sm text-[#7C776B]">Fluxo financeiro preparado para links e cartão via Asaas.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">Por que agora</p>
            <h2 className="mt-3 text-3xl font-bold text-[#211F1C]">O problema não é atender. É manter tudo organizado depois.</h2>
            <p className="mt-4 leading-relaxed text-[#5F5A51]">
              A landing precisa cativar porque fala de alívio: menos abas abertas, menos retrabalho e mais segurança na entrega profissional.
            </p>
          </div>
          <div className="grid gap-3">
            {pains.map((item) => (
              <article key={item.title} className="rounded-lg border border-[#E7E4DA] bg-[#FFFFFF] p-5 shadow-sm">
                <h3 className="font-semibold text-[#211F1C]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#7C776B]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="produto" className="border-y border-[#E7E4DA] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">Produto</p>
            <h2 className="mt-3 text-3xl font-bold text-[#211F1C]">Uma operação mais leve para o dia a dia clínico.</h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-lg border border-[#E7E4DA] bg-[#F7F8F5] p-5">
                <Icon className="mb-4 h-5 w-5 text-sage-600" />
                <h3 className="font-semibold text-[#211F1C]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#7C776B]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pro" className="mx-auto grid max-w-6xl gap-8 px-5 py-16 lg:grid-cols-[0.9fr_1fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">Plano Pro</p>
          <h2 className="mt-3 text-3xl font-bold text-[#211F1C]">Para vender mais tempo, não mais trabalho.</h2>
          <p className="mt-4 max-w-xl leading-relaxed text-[#5F5A51]">
            O Pro é o plano para psicólogos que já atendem com frequência e querem automatizar cobranças,
            mensagens e organização financeira sem perder controle da rotina.
          </p>
        </div>

        <div className="rounded-lg border border-sage-200 bg-[#FFFFFF] p-6 shadow-card">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-sage-700">UseCognia Pro</p>
              <p className="mt-1 text-3xl font-bold text-[#211F1C]">7 dias grátis</p>
            </div>
            <span className="rounded-full bg-sage-100 px-3 py-1 text-xs font-semibold text-sage-700">sem compromisso</span>
          </div>
          <ul className="space-y-3">
            {proItems.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm font-medium text-[#49443D]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            to="/cadastro"
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-sage-800 text-sm font-bold text-white hover:bg-sage-900"
          >
            Começar teste grátis
          </Link>
          <p className="mt-3 text-center text-xs text-[#A9A394]">Configure o essencial primeiro. Automatize depois.</p>
        </div>
      </section>

      <section id="faq" className="border-y border-[#E7E4DA] bg-[#FFFFFF]">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <div className="text-center mb-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">Dúvidas frequentes</p>
            <h2 className="mt-3 text-3xl font-bold text-[#211F1C]">Perguntas antes de começar</h2>
          </div>
          <div className="divide-y divide-[#E7E4DA]">
            {faqs.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span className="font-semibold text-[#211F1C] group-open:text-sage-700">{item.question}</span>
                  <span className="shrink-0 text-[#7C776B] text-lg leading-none group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[#7C776B]">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0E1324] px-5 py-16 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold">Pronto para deixar o consultório com cara de operação profissional?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            Comece pela agenda e pelos documentos. Em poucos minutos você já vê se a UseCognia combina com sua rotina.
          </p>
          <Link
            to="/cadastro"
            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#9BE7C1] px-6 text-sm font-bold text-[#102019] hover:bg-[#B8F2D0]"
          >
            Testar 7 dias grátis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
