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
  'Plano gratis',
  'Para psicólogos, terapeutas e estagiários clínicos',
  'Sem cartão para começar',
]

const pains = [
  {
    title: 'Paciente esquece sessão',
    text: 'Quando a agenda depende da memória e do WhatsApp, faltas e desencontros começam a aparecer.',
  },
  {
    title: 'Prontuário fica espalhado',
    text: 'Histórico, evoluções, documentos e observações clínicas não deveriam morar em lugares diferentes.',
  },
  {
    title: 'Rotina manual demais',
    text: 'Confirmar horário, organizar paciente e registrar sessão consome energia que deveria ir para a clínica.',
  },
]

const features = [
  {
    icon: CalendarCheck2,
    title: 'Agenda online com link público',
    text: 'Crie horários, organize sessões e compartilhe uma página simples para agendamento.',
  },
  {
    icon: FileSignature,
    title: 'Prontuário clínico digital',
    text: 'Registre evoluções, acompanhe histórico e mantenha dados clínicos em uma rotina mais segura.',
  },
  {
    icon: WalletCards,
    title: 'Organização de pacientes',
    text: 'Tenha pacientes, sessões, documentos e informações importantes sem depender de planilhas soltas.',
  },
  {
    icon: MessageSquareText,
    title: 'Lembretes em evolução',
    text: 'Estamos construindo lembretes automáticos para reduzir esquecimentos e confirmações manuais.',
  },
]

const freeItems = [
  'Acesso gratuito sem cartao',
  'Agenda online com link publico',
  'Cadastro de ate 10 pacientes',
  'Prontuario e evolucoes em um so lugar',
  'Ideal para estagiarios, psicologos e terapeutas no inicio da rotina',
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

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full min-w-0 max-w-[calc(100vw-40px)] overflow-hidden rounded-lg border border-white/15 bg-[#17211D] shadow-2xl sm:max-w-[560px]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sage-200">Painel UseCognia</p>
          <p className="mt-1 text-sm text-white/70">Rotina clinica</p>
        </div>
        <span className="shrink-0 rounded-full bg-sage-200 px-3 py-1 text-xs font-semibold text-sage-900">Plano gratis</span>
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
            <a href="#gratis" className="hover:text-sage-700">Plano gratis</a>
            <button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-sage-700">Dúvidas</button>
            <Link to="/seguranca" className="hover:text-sage-700">Segurança</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden px-3 py-2 text-sm font-semibold text-[#49443D] hover:text-sage-700 sm:inline-flex">
              Entrar
            </Link>
            <Link to="/cadastro" className="hidden rounded-md bg-sage-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sage-900 sm:inline-flex">
              Quero testar
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#1D352D] text-white">
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
        <div className="mx-auto grid w-full max-w-6xl min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-10 px-5 py-16 sm:py-20 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:py-24">
          <div className="w-full min-w-0 max-w-full sm:max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-sm font-semibold text-sage-200">
              <Sparkles className="h-4 w-4" />
              Plano gratis para psicólogos, terapeutas e estagiários
            </p>

            <h1 className="mt-6 max-w-[21rem] text-[2.1rem] font-bold leading-[1.06] tracking-normal text-white sm:max-w-2xl sm:text-5xl lg:text-6xl">
              Menos bagunça na rotina clínica. Mais tempo para cuidar dos seus pacientes.
            </h1>

            <p className="mt-6 max-w-[22rem] text-base leading-relaxed text-white/76 sm:max-w-xl sm:text-lg">
              UseCognia organiza agenda, pacientes, prontuário e histórico clínico em uma plataforma simples para quem atende na clínica e quer construir uma rotina mais profissional.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/cadastro"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-sage-200 px-5 text-sm font-bold text-sage-900 shadow-lg shadow-sage-200/15 hover:bg-sage-100"
              >
                Começar gratis <ArrowRight className="h-4 w-4" />
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
                  <CheckCircle2 className="h-4 w-4 text-sage-200" />
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
              <p className="mt-1 text-sm text-[#7C776B]">Dados clínicos tratados com cuidado desde a base do produto.</p>
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
              <p className="text-sm font-semibold text-[#211F1C]">Construído com usuários reais</p>
              <p className="mt-1 text-sm text-[#7C776B]">Criado para a rotina de psicólogos, terapeutas e estagiários clínicos.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">Por que agora</p>
            <h2 className="mt-3 text-3xl font-bold text-[#211F1C]">Você não estudou para virar administrador de agenda.</h2>
            <p className="mt-4 leading-relaxed text-[#5F5A51]">
              A clínica exige presença. Mas a rotina ao redor dela costuma virar uma mistura de WhatsApp, planilha, agenda, caderno e lembretes soltos. É exatamente essa dor que queremos resolver com os primeiros usuários.
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
            <h2 className="mt-3 text-3xl font-bold text-[#211F1C]">O essencial da rotina clínica em um só lugar.</h2>
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

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="text-center mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">Por que começar agora</p>
          <h2 className="mt-3 text-3xl font-bold text-[#211F1C]">Uma rotina clínica mais organizada desde o primeiro paciente.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              quote: 'Você começa pelo que mais pesa na rotina: agenda, pacientes, prontuário e documentos em um só lugar.',
              name: 'Começo simples',
              role: 'Sem precisar configurar tudo de uma vez',
              initial: 'A',
            },
            {
              quote: 'O sistema ajuda a reduzir a dependência de caderno, planilha e mensagens soltas no WhatsApp.',
              name: 'Menos retrabalho',
              role: 'Mais clareza para operar a clínica',
              initial: 'P',
            },
            {
              quote: 'Quando a rotina crescer, os planos pagos liberam documentos, automações, instrumentos e IA.',
              name: 'Cresce com você',
              role: 'Do plano grátis ao Pro',
              initial: 'S',
            },
          ].map(({ quote, name, role, initial }) => (
            <figure key={name} className="rounded-xl border border-[#E7E4DA] bg-white p-6 shadow-sm">
              <blockquote className="text-sm leading-relaxed text-[#49443D]">"{quote}"</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sm font-bold text-sage-700">
                  {initial}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#211F1C]">{name}</p>
                  <p className="text-xs text-[#7C776B]">{role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="gratis" className="mx-auto grid max-w-6xl gap-8 px-5 py-16 lg:grid-cols-[0.9fr_1fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">Plano gratis</p>
          <h2 className="mt-3 text-3xl font-bold text-[#211F1C]">Comece sem cartão e organize os primeiros pacientes.</h2>
          <p className="mt-4 max-w-xl leading-relaxed text-[#5F5A51]">
            O plano grátis foi pensado para quem quer sair da bagunça inicial sem assumir custo de imediato. Quando precisar de mais limite ou automação, escolha Essencial ou Pro.
          </p>
        </div>

        <div className="rounded-lg border border-sage-200 bg-[#FFFFFF] p-6 shadow-card">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-sage-700">UseCognia Gratis</p>
              <p className="mt-1 text-3xl font-bold text-[#211F1C]">Gratuito</p>
            </div>
            <span className="rounded-full bg-sage-100 px-3 py-1 text-xs font-semibold text-sage-700">sem cartao</span>
          </div>
          <ul className="space-y-3">
            {freeItems.map((item) => (
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
            Começar gratis
          </Link>
          <p className="mt-3 text-center text-xs text-[#A9A394]">Sem cartão. Você pode mudar de plano depois.</p>
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

      <section className="bg-[#1D352D] px-5 py-16 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold">Pronto para deixar o consultório com cara de operação profissional?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            Comece gratis e organize agenda, pacientes e prontuário em uma rotina mais simples.
          </p>
          <Link
            to="/cadastro"
            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-sage-200 px-6 text-sm font-bold text-sage-900 hover:bg-sage-100"
          >
            Começar gratis <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="mt-6 flex justify-center gap-4 text-sm text-white/60">
            <Link to="/acessibilidade" className="hover:text-white">Acessibilidade</Link>
            <Link to="/privacidade" className="hover:text-white">Privacidade</Link>
            <Link to="/termos" className="hover:text-white">Termos</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
