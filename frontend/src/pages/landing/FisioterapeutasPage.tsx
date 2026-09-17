import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Activity,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  Layers,
  Ruler,
  Shield,
  Star,
} from 'lucide-react'
import BrandLogo from '@/components/ui/BrandLogo'
import { LeadCaptureForm } from '@/components/marketing/LeadCaptureForm'
import { usePageSeo } from '@/lib/pageSeo'

const REGISTER_URL =
  '/cadastro?utm_source=landing&utm_medium=organic&utm_campaign=fisioterapeutas'

const pains = [
  {
    title: 'Prontuário no Word ou papel — sem estrutura para semiologia e diagnóstico cinesiofuncional',
    text: 'Documentos genéricos não têm os campos que a fisioterapia exige: goniometria, testes ortopédicos, escala de dor, diagnóstico cinesiofuncional separado do médico.',
  },
  {
    title: 'Campos genéricos que não cabem fisioterapia — sistema criado para médico, adaptado às pressas',
    text: 'Software pensado para consulta médica não comporta o raciocínio clínico fisioterapêutico nem o vocabulário do COFFITO.',
  },
  {
    title: 'Quantitativo de sessões por paciente controlado no caderno ou na memória',
    text: 'Sem controle integrado de pacotes de atendimento, é difícil saber quantas sessões cada paciente já utilizou e quantas ainda restam.',
  },
]

const features = [
  {
    icon: Activity,
    title: 'Diagnóstico cinesiofuncional separado do diagnóstico médico',
    text: 'Campo exclusivo para o fisioterapeuta registrar o diagnóstico cinesiofuncional sem misturar com o CID médico.',
    accent: 'text-sky-600 bg-sky-50',
  },
  {
    icon: Ruler,
    title: 'Semiologia estruturada: goniometria, testes ortopédicos, escala de dor',
    text: 'Formulários de avaliação prontos para documentar a avaliação inicial e reavaliações com os dados que a clínica precisa.',
    accent: 'text-sage-600 bg-sage-50',
  },
  {
    icon: Layers,
    title: 'Controle de sessões por pacote (COFFITO Res. 414/2012)',
    text: 'Gerencie pacotes pré-pagos de atendimento com controle automático de saldo de sessões por paciente.',
    accent: 'text-amber-600 bg-amber-50',
  },
  {
    icon: FileCheck2,
    title: 'Evolução por sessão com assinatura e CREFITO',
    text: 'Registro de evolução por sessão com identificação do profissional e número de registro no CREFITO, conforme a resolução.',
    accent: 'text-purple-600 bg-purple-50',
  },
]

const coffitoItems = [
  {
    norm: 'COFFITO Res. 414/2012',
    title: 'Campos obrigatórios do prontuário fisioterapeêutico',
    text: 'A resolução exige identificação do paciente, exame físico por semiologia, diagnóstico cinesiofuncional, prognóstico, plano terapêutico com quantitativo provável de atendimentos e registro de evolução por sessão com assinatura e número de CREFITO.',
  },
  {
    norm: 'LGPD — Lei 13.709/2018',
    title: 'Proteção de dados do paciente',
    text: 'Prontuário fisioterapeêutico é dado pessoal sensível (LGPD art. 11). O UseCognia adota pseudonimização, controle de acesso por profissional e retenção conforme o prazo regulatório, mantendo a privacidade do paciente em conformidade com a lei.',
  },
]

const faq = [
  {
    q: 'O prontuário atende às exigências da COFFITO Res. 414/2012?',
    a: 'Sim. O prontuário fisioterapeêutico do UseCognia contempla os campos previstos na COFFITO Res. 414/2012: identificação, exame físico com semiologia, diagnóstico cinesiofuncional, prognóstico, plano terapêutico, quantitativo de atendimentos e evolução por sessão com identificação do CREFITO.',
  },
  {
    q: 'Posso controlar pacotes de sessões por paciente?',
    a: 'Sim. O sistema permite cadastrar pacotes pré-pagos de atendimento e controlar automaticamente o saldo de sessões por paciente — eliminando o caderno de controle manual.',
  },
  {
    q: 'Como funciona o diagnóstico cinesiofuncional separado do CID médico?',
    a: 'O prontuário do UseCognia tem um campo exclusivo para o diagnóstico cinesiofuncional, separado do campo de encaminhamento médico. Isso garante que o raciocínio clínico fisioterapeêutico fique documentado de forma independente, conforme exige a resolução do COFFITO.',
  },
  {
    q: 'Tem versão gratuita para fisioterapeutas?',
    a: 'Sim — 7 dias grátis com acesso completo, sem cartão de crédito e sem compromisso. Para continuar após o teste, os planos começam em R$ 49/mês.',
  },
  {
    q: 'Existe período de teste gratuito?',
    a: 'Sim — 7 dias grátis, sem cartão de crédito. Após o teste, os planos pagos começam em R$ 49/mês, sem contrato de fidelidade e com cancelamento quando quiser pelo próprio painel.',
  },
  {
    q: 'Os dados dos meus pacientes ficam seguros?',
    a: 'Sim. Prontuário fisioterapêutico é dado sensível de saúde conforme a LGPD. O UseCognia armazena todos os dados com criptografia em trânsito e em repouso, controle de acesso por profissional e backups diários. Você pode exportar ou excluir os dados a qualquer momento.',
  },
]

export default function FisioterapeutasPage() {
  usePageSeo({
    title: 'Prontuário fisioterapêutico digital — UseCognia',
    description:
      'Prontuário fisioterapêutico com diagnóstico cinesiofuncional, semiologia estruturada e controle de sessões por pacote. Conforme COFFITO Res. 414/2012.',
    canonicalPath: '/fisioterapeutas',
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
            <a href="#coffito" className="hover:text-sage-700">Conformidade COFFITO</a>
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
              Testar 7 dias grátis
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
              Para fisioterapeutas
            </p>

            <h1 className="mt-6 text-[1.9rem] font-bold leading-[1.1] tracking-normal text-white sm:text-5xl lg:text-[3rem]">
              Chega de prontuário de médico adaptado para fisio. Diagnóstico cinesiofuncional, semiologia e controle de sessões — com os campos que o COFFITO Res. 414 exige.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80 sm:text-lg">
              Diagnóstico cinesiofuncional separado do CID médico, goniometria, testes ortopédicos e controle de pacotes pré-pagos de atendimento. Tudo no mesmo prontuário, sem planilha, sem papel.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to={REGISTER_URL}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#CFF3DE] px-6 text-sm font-bold text-[#143D2D] shadow-lg shadow-black/15 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Testar 7 dias grátis <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/25 px-6 text-sm font-semibold text-white hover:border-white/50 hover:text-white"
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
              <p className="text-2xl font-bold text-[#211F1C]">+400</p>
              <p className="text-sm text-[#7C776B]">fisioterapeutas organizam seus atendimentos no UseCognia</p>
            </div>
            <div className="hidden h-10 w-px bg-[#E7E4DA] sm:block" />
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-2xl font-bold text-[#211F1C]">COFFITO 414</p>
              <p className="text-sm text-[#7C776B]">campos obrigatórios prontos no prontuário fisioterapêutico</p>
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
              O sistema que você usa foi feito para médicos, não para fisioterapeutas.
            </h2>
            <p className="mt-4 leading-relaxed text-[#5F5A51]">
              Prontuário genérico não documenta o raciocínio clínico fisioterapêutico, não controla
              pacotes de atendimento e não tem os campos exigidos pela COFFITO Res. 414/2012.
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
              Tudo que a clínica de fisioterapia precisa, no mesmo lugar.
            </h2>
            <p className="mt-4 leading-relaxed text-[#5F5A51]">
              Campos e fluxos pensados para a fisioterapia, não adaptados de outro contexto.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
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
        </div>
      </section>

      {/* ── Depoimentos ── */}
      <section className="border-y border-[#E7E4DA] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">
              O que dizem os fisioterapeutas
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#211F1C] sm:text-3xl">
              Mais de 400 fisioterapeutas já escolheram o UseCognia
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                quote: 'Usava um sistema feito para médico e o diagnóstico cinesiofuncional eu escrevia num campo de observações. Com o UseCognia ele tem campo próprio, separado do CID, e a documentação está dentro do que o COFFITO exige. Isso me deu muita tranquilidade.',
                name: 'Dr. Rodrigo Carvalho',
                role: 'Fisioterapeuta ortopédico, clínica própria — São Paulo',
              },
              {
                quote: 'O controle de pacotes de sessões acabou com o caderno. Cada paciente tem o saldo atualizado em tempo real — eu sei exatamente quantas sessões foram feitas e quantas restam, sem precisar consultar nada separado.',
                name: 'Tatiane Alves',
                role: 'Fisioterapeuta, clínica de reabilitação — Belo Horizonte',
              },
              {
                quote: 'A semiologia estruturada com goniometria e testes ortopédicos padronizou o jeito que eu documento minha avaliação inicial. Antes cada prontuário era de um jeito — agora todos seguem o mesmo padrão e consigo comparar reavaliações facilmente.',
                name: 'Dr. Marcos Pinheiro',
                role: 'Fisioterapeuta neurológico, clínica particular — Recife',
              },
            ].map(({ quote, name, role }) => (
              <article key={name} className="flex flex-col gap-4 rounded-lg border border-[#E7E4DA] bg-[#F7F8F5] p-6">
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
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">
              Recurso gratuito
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#211F1C]">
              Receba o checklist gratuito de campos obrigatórios do prontuário fisioterapêutico
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#5F5A51]">
              Checklist COFFITO 414: todos os campos obrigatórios que o prontuário fisioterapêutico
              precisa ter para estar em conformidade com a resolução.
            </p>
          </div>
          <LeadCaptureForm
            source="landing-fisioterapeutas"
            defaultProfession="fisioterapia"
            title="Quero o checklist COFFITO Res. 414/2012"
            professionOptions={['fisioterapia']}
            ctaLabel="Enviar checklist por e-mail"
          />
        </div>
      </section>

      {/* ── Conformidade regulatória (COFFITO) ── */}
      <section id="coffito" className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">
            Conformidade regulatória
          </p>
          <h2 className="mt-3 text-2xl font-bold text-[#211F1C] sm:text-3xl">
            Prontuário alinhado às resoluções do COFFITO.
          </h2>
          <p className="mt-4 leading-relaxed text-[#5F5A51]">
            O UseCognia foi desenhado com base nas resoluções do Conselho Federal de Fisioterapia
            e Terapia Ocupacional para garantir que sua documentação clínica esteja em conformidade.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {coffitoItems.map(({ norm, title, text }) => (
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

        <div className="mt-8 rounded-lg border border-sky-100 bg-sky-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
            <p className="text-sm leading-relaxed text-[#49443D]">
              <strong>Responsabilidade técnica:</strong> a IA do UseCognia gera apenas rascunhos
              de evolução para revisão do fisioterapeuta. O diagnóstico cinesiofuncional, o plano
              terapêutico e a conduta são sempre de responsabilidade exclusiva do fisioterapeuta
              habilitado, conforme a COFFITO Res. 414/2012.
            </p>
          </div>
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
                Perguntas de fisioterapeutas
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
            Risco zero — 7 dias grátis
          </p>
          <h2 className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">
            Prontuário fisioterapêutico com os campos do COFFITO, controle de sessões e agenda — sem custo para começar
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/80">
            Configure sua clínica em 5 minutos e teste por 7 dias sem compromisso. Se não for para você, cancela com um clique.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              to={REGISTER_URL}
              className="inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-md bg-[#CFF3DE] px-6 text-sm font-bold text-[#143D2D] shadow-lg hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
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
          Teste 7 dias grátis <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  )
}
