import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Download,
  EyeOff,
  FileCheck2,
  KeyRound,
  LockKeyhole,
  Server,
  ShieldCheck,
} from 'lucide-react'
import BrandLogo from '@/components/ui/BrandLogo'

const controls = [
  'HTTPS/TLS em toda comunicação com a plataforma',
  'Senhas protegidas com Argon2id, nunca armazenadas em texto puro',
  'Sessões em cookies HttpOnly, com rotação e proteção CSRF',
  'Isolamento de pacientes e registros por conta no servidor',
  'Campos clínicos e anexos criptografados com AES-256-GCM',
  'Limites contra força bruta e bloqueio de acessos suspeitos',
  'Validação de entradas e do conteúdo real de arquivos enviados',
  'Testes, auditoria de dependências e busca de segredos no CI',
]

const pillars = [
  {
    icon: KeyRound,
    title: 'Acesso individual',
    text: 'Cada requisição autenticada identifica o profissional e aplica o proprietário do registro na consulta ao banco.',
  },
  {
    icon: EyeOff,
    title: 'Sigilo clínico',
    text: 'Conteúdo clínico não é usado para publicidade, revenda ou analytics. Logs operacionais evitam registrar prontuários.',
  },
  {
    icon: Server,
    title: 'Infraestrutura gerenciada',
    text: 'A interface opera na Vercel e a API com PostgreSQL na Railway. Integrações opcionais recebem somente o necessário.',
  },
]

const transparency = [
  'Não utilizamos a expressão “100% seguro”: nenhum serviço conectado à internet é invulnerável.',
  'A criptografia protege o trânsito e campos sensíveis no banco, mas não é criptografia de ponta a ponta.',
  'A adequação à LGPD é contínua e não equivale a certificação ou parecer jurídico.',
  'O profissional continua responsável pelo sigilo, pela base legal e pelos prazos de guarda dos prontuários.',
]

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-[#F7F8F5] text-[#211F1C] transition-colors dark:bg-[#0d1512] dark:text-neutral-100">
      <header className="border-b border-[#E7E4DA] bg-white/90 backdrop-blur dark:border-white/10 dark:bg-[#101915]/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/plataforma" aria-label="Voltar para a página inicial">
            <BrandLogo className="h-10 w-auto" />
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold">
            <Link to="/privacidade" className="hidden text-sage-800 hover:text-sage-950 dark:text-sage-200 dark:hover:text-white sm:block">Privacidade</Link>
            <Link to="/cadastro" className="rounded-md bg-sage-800 px-4 py-2 text-white hover:bg-sage-900 dark:bg-sage-500 dark:hover:bg-sage-400">Conhecer</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-sage-700 dark:border-sage-300/25 dark:bg-sage-500/15 dark:text-sage-200">
            <ShieldCheck className="h-4 w-4" /> Segurança verificável
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            Proteção em camadas para dados clínicos sensíveis.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#5F5A51] dark:text-neutral-300">
            Publicamos os controles que existem hoje, como eles funcionam e também suas limitações. Segurança é um processo contínuo, não uma promessa genérica.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/cadastro" className="inline-flex h-12 items-center justify-center rounded-md bg-sage-800 px-5 text-sm font-bold text-white hover:bg-sage-900 dark:bg-sage-500 dark:hover:bg-sage-400">
              Testar a plataforma
            </Link>
            <a href="mailto:contato@usecognia.com.br?subject=Segurança%20UseCognia" className="inline-flex h-12 items-center justify-center rounded-md border border-sage-200 bg-white px-5 text-sm font-bold text-sage-900 hover:bg-sage-50 dark:border-white/15 dark:bg-white/5 dark:text-sage-100 dark:hover:bg-white/10">
              Tirar uma dúvida
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-sage-100 bg-white p-6 shadow-card dark:border-white/10 dark:bg-[#17211d]">
          <p className="text-sm font-semibold text-sage-800 dark:text-sage-200">Controles ativos na plataforma</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {controls.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-xl border border-[#E7E4DA] bg-[#FBFCFA] px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage-600 dark:text-sage-300" />
                <span className="text-sm font-medium leading-relaxed text-[#49443D] dark:text-neutral-200">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#E7E4DA] bg-white dark:border-white/10 dark:bg-[#101713]">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-14 md:grid-cols-3">
          {pillars.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-xl border border-[#E7E4DA] bg-[#F7F8F5] p-5 dark:border-white/10 dark:bg-white/5">
              <Icon className="h-5 w-5 text-sage-700 dark:text-sage-300" />
              <h2 className="mt-4 font-semibold dark:text-white">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#6F6A61] dark:text-neutral-300">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-2">
        <article className="rounded-2xl border border-sage-200 bg-sage-50 p-6 dark:border-sage-300/20 dark:bg-sage-500/10">
          <LockKeyhole className="h-6 w-6 text-sage-700 dark:text-sage-300" />
          <h2 className="mt-4 text-xl font-bold text-sage-950 dark:text-sage-100">Isolamento testado entre contas</h2>
          <p className="mt-3 text-sm leading-relaxed text-sage-900 dark:text-neutral-200">
            Testes automatizados simulam dois profissionais e tentativas de acesso cruzado a pacientes, sessões, documentos, agenda, financeiro e anexos. A consulta exige o identificador do proprietário no servidor e retorna “não encontrado” para registros de outra conta.
          </p>
        </article>

        <article className="rounded-2xl border border-[#E7E4DA] bg-white p-6 dark:border-white/10 dark:bg-[#17211d]">
          <FileCheck2 className="h-6 w-6 text-sage-700 dark:text-sage-300" />
          <h2 className="mt-4 text-xl font-bold dark:text-white">Privacidade e portabilidade</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#5F5A51] dark:text-neutral-300">
            O profissional pode exportar os dados da conta. Antes da exclusão, deve preservar prontuários sujeitos a prazos de guarda profissional. A política detalha finalidades, fornecedores e direitos dos titulares.
          </p>
          <Link to="/privacidade" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-sage-700 hover:text-sage-900 dark:text-sage-300 dark:hover:text-sage-100">
            <Download className="h-4 w-4" /> Ler Política de Privacidade
          </Link>
        </article>
      </section>

      <section className="border-y border-amber-200 bg-amber-50 dark:border-amber-300/20 dark:bg-amber-500/10">
        <div className="mx-auto max-w-4xl px-5 py-12">
          <h2 className="text-xl font-bold text-amber-950 dark:text-amber-100">Transparência sobre limites</h2>
          <ul className="mt-5 grid gap-3">
            {transparency.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-amber-950 dark:text-amber-100">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-14 text-center">
        <h2 className="text-2xl font-bold dark:text-white">Encontrou uma vulnerabilidade?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#6F6A61] dark:text-neutral-300">
          Relate de forma responsável, sem acessar dados de terceiros. Envie a descrição, impacto e passos mínimos de reprodução para contato@usecognia.com.br com o assunto “Segurança”.
        </p>
        <a href="mailto:contato@usecognia.com.br?subject=Relato%20de%20segurança" className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-sage-800 px-5 text-sm font-bold text-white hover:bg-sage-900 dark:bg-sage-500 dark:hover:bg-sage-400">
          Relatar com responsabilidade
        </a>
        <p className="mt-6 text-xs text-[#817B72] dark:text-neutral-400">Última revisão técnica: julho de 2026.</p>
      </section>
    </main>
  )
}
