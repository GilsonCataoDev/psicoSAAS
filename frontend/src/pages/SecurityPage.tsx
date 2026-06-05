import { Link } from 'react-router-dom'
import { CheckCircle2, Download, FileCheck2, LockKeyhole, ShieldCheck } from 'lucide-react'
import BrandLogo from '@/components/ui/BrandLogo'

const controls = [
  'HTTPS/TLS em toda comunicacao',
  'Senhas protegidas com hash seguro',
  'Isolamento de dados por conta de psicologo',
  'Campos sensiveis criptografados em repouso',
  'Protecao contra CSRF e limitacao de requisicoes',
  'Logs de auditoria para acoes sensiveis',
]

const commitments = [
  {
    icon: ShieldCheck,
    title: 'LGPD sem burocracia',
    text: 'A UseCognia atua como operadora dos dados de pacientes e como controladora dos dados da conta do profissional.',
  },
  {
    icon: LockKeyhole,
    title: 'Sigilo profissional preservado',
    text: 'O conteudo clinico e usado para operar a plataforma, nao para publicidade, revenda ou analise comercial.',
  },
  {
    icon: Download,
    title: 'Portabilidade',
    text: 'O profissional pode exportar dados da conta, pacientes, agenda, financeiro, documentos e historico quando precisar.',
  },
  {
    icon: FileCheck2,
    title: 'Documentos verificaveis',
    text: 'Documentos gerados possuem codigo unico e pagina publica de verificacao sem expor conteudo clinico.',
  },
]

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-[#F7F8F5] text-[#211F1C]">
      <header className="border-b border-[#E7E4DA] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/plataforma"><BrandLogo className="h-10 w-auto" /></Link>
          <nav className="flex items-center gap-4 text-sm font-semibold">
            <Link to="/privacidade" className="text-[#5F5A51] hover:text-sage-700">Privacidade</Link>
            <Link to="/cadastro" className="rounded-md bg-sage-800 px-4 py-2 text-white hover:bg-sage-900">Comecar</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:py-20">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">Seguranca e conformidade</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#211F1C] sm:text-5xl">
            Protecao clara para dados clinicos sensiveis.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#5F5A51]">
            O UseCognia foi desenhado para psicologos que precisam organizar a rotina sem abrir mao de sigilo,
            portabilidade e controles alinhados a LGPD e boas praticas do CFP.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/privacidade" className="inline-flex h-12 items-center justify-center rounded-md bg-sage-800 px-5 text-sm font-bold text-white hover:bg-sage-900">
              Ler Politica de Privacidade
            </Link>
            <a href="mailto:privacidade@usecognia.com.br" className="inline-flex h-12 items-center justify-center rounded-md border border-sage-200 bg-white px-5 text-sm font-bold text-sage-800 hover:bg-sage-50">
              Falar com privacidade
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-sage-100 bg-white p-6 shadow-card">
          <p className="text-sm font-semibold text-sage-700">Controles ja previstos na plataforma</p>
          <div className="mt-5 grid gap-3">
            {controls.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg border border-[#E7E4DA] bg-[#FBFCFA] px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" />
                <span className="text-sm font-medium text-[#49443D]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#E7E4DA] bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-14 md:grid-cols-4">
          {commitments.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-xl border border-[#E7E4DA] bg-[#F7F8F5] p-5">
              <Icon className="h-5 w-5 text-sage-700" />
              <h2 className="mt-4 font-semibold text-[#211F1C]">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#6F6A61]">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-14">
        <div className="rounded-2xl border border-sage-200 bg-sage-50 p-6">
          <h2 className="text-xl font-bold text-sage-950">O que isso significa na pratica</h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-sage-900">
            <p>O psicologo continua responsavel pelo conteudo clinico e pela base legal do atendimento.</p>
            <p>A UseCognia fornece os controles tecnicos para armazenar, exportar e proteger esses dados.</p>
            <p>Mensagens automaticas devem evitar conteudo clinico detalhado. O ideal e enviar apenas lembretes operacionais.</p>
          </div>
        </div>
      </section>
    </main>
  )
}
