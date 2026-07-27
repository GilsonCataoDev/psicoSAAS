import { Link } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'

type DpaSection = {
  title: string
  paragraphs: string[]
}

const sections: DpaSection[] = [
  {
    title: '1. Escopo e vigência',
    paragraphs: [
      'Este Acordo de Tratamento de Dados (“DPA”) complementa os Termos de Uso e se aplica quando o profissional ou a clínica utiliza o UseCognia para tratar dados pessoais de pacientes, responsáveis, contatos ou outros titulares.',
      'O DPA permanece vigente enquanto o UseCognia tratar dados pessoais em nome do cliente. Em caso de conflito sobre proteção de dados, este documento prevalece sobre disposições gerais dos Termos de Uso.',
    ],
  },
  {
    title: 'Papéis das partes',
    paragraphs: [
      'O profissional ou a clínica decide por que e como os dados de pacientes serão utilizados e atua como controlador. Cabe ao controlador definir a base legal, prestar as informações necessárias aos titulares e cumprir as normas profissionais aplicáveis.',
      'O UseCognia atua como operador para os dados inseridos nos módulos clínicos e administrativos, tratando-os para prestar o serviço conforme as configurações e ações do controlador. Para dados próprios de cadastro, cobrança, segurança e suporte da conta, o UseCognia pode atuar como controlador independente, conforme a Política de Privacidade.',
    ],
  },
  {
    title: '3. Objeto, duração e finalidade',
    paragraphs: [
      'O tratamento abrange hospedagem, organização, consulta, alteração, transmissão, exportação, cópia de segurança e exclusão necessárias às funcionalidades contratadas: pacientes, agenda, sessões, prontuários, documentos, anexos, instrumentos, financeiro, comunicações e integrações opcionais.',
      'O UseCognia não vende prontuários, não utiliza conteúdo clínico para publicidade e não trata esses dados para finalidades próprias incompatíveis com a prestação do serviço.',
    ],
  },
  {
    title: '4. Titulares e categorias de dados',
    paragraphs: [
      'Os titulares podem incluir pacientes, responsáveis legais, familiares, contatos de emergência, profissionais relacionados ao atendimento e usuários autorizados da conta.',
      'Os dados podem incluir identificação e contato, informações de agenda e atendimento, dados financeiros, documentos, anexos, comunicações e dados pessoais sensíveis relativos à saúde. Também são tratados registros técnicos de autenticação, segurança e auditoria.',
    ],
  },
  {
    title: '5. Instruções e responsabilidades do controlador',
    paragraphs: [
      'As ações realizadas na conta, as configurações escolhidas e os recursos acionados constituem instruções documentadas ao UseCognia. O controlador não deve enviar dados desnecessários nem utilizar a plataforma para finalidade ilícita ou incompatível com o sigilo profissional.',
      'O controlador é responsável por suas credenciais, pela gestão dos acessos, pela exatidão dos dados, pela comunicação com os titulares e por exportar os registros sujeitos a obrigações profissionais de guarda antes do encerramento da conta.',
    ],
  },
  {
    title: '6. Deveres do UseCognia',
    paragraphs: [
      'O UseCognia tratará os dados somente para executar as instruções legítimas do controlador, limitará o acesso às pessoas e serviços necessários, manterá deveres de confidencialidade e informará quando considerar que uma instrução viola a legislação aplicável.',
      'Solicitações de autoridades serão avaliadas quanto à validade e ao escopo. Quando permitido, o controlador será informado antes da entrega de dados.',
    ],
  },
  {
    title: '7. Segurança e confidencialidade',
    paragraphs: [
      'São aplicados controles proporcionais ao risco, incluindo HTTPS/TLS, senhas com Argon2id, sessões HttpOnly, proteção CSRF, limitação de tentativas, isolamento por conta no servidor, criptografia AES-256-GCM para campos clínicos e anexos, validação de arquivos, trilhas de auditoria e verificações automatizadas no processo de desenvolvimento.',
      'Nenhum sistema é invulnerável. Os controles existentes, suas limitações e o canal de relato responsável são publicados na página de Segurança.',
    ],
  },
  {
    title: '8. Direitos dos titulares e cooperação',
    paragraphs: [
      'Como o profissional ou a clínica mantém a relação com o paciente, pedidos relativos ao prontuário devem ser encaminhados ao controlador. Mediante solicitação razoável, o UseCognia auxiliará o controlador com os recursos disponíveis para localizar, corrigir, exportar ou excluir dados, quando legalmente permitido.',
      'Se o UseCognia receber diretamente um pedido referente a dados controlados pelo cliente, encaminhará o titular ao controlador, salvo impedimento legal.',
    ],
  },
  {
    title: 'Incidentes de segurança',
    paragraphs: [
      'Ao confirmar incidente que envolva dados tratados em nome do controlador, o UseCognia o informará sem demora indevida pelo contato cadastrado, compartilhando as informações disponíveis sobre natureza, categorias afetadas, possíveis consequências e medidas adotadas. Informações ainda desconhecidas poderão ser complementadas posteriormente.',
      'O controlador decide e realiza as comunicações à ANPD e aos titulares quando exigidas. O regulamento vigente da ANPD prevê prazo de três dias úteis para incidentes que possam causar risco ou dano relevante, ressalvada legislação específica. As partes cooperarão para investigação, mitigação e registro do ocorrido.',
    ],
  },
  {
    title: '10. Retenção, exportação e exclusão',
    paragraphs: [
      'Durante a vigência, o controlador pode utilizar os recursos de exportação. No encerramento, deve salvar os registros que precise conservar por obrigação legal, ética ou profissional.',
      'Após solicitação válida de exclusão, os dados ativos são removidos conforme o fluxo da plataforma, ressalvadas retenções exigidas por lei, prevenção de fraude ou exercício regular de direitos. Cópias residuais em backups criptografados são eliminadas conforme a rotação operacional, atualmente em até 30 dias, salvo obrigação legal diferente.',
    ],
  },
  {
    title: '11. Auditoria e informações',
    paragraphs: [
      'O UseCognia disponibilizará informações razoavelmente necessárias para demonstrar os controles descritos neste DPA, preservando segredos comerciais, dados de outros clientes e a segurança da infraestrutura.',
      'A publicação deste documento e dos controles de segurança não representa certificação da ANPD, auditoria independente, parecer jurídico ou garantia de segurança absoluta.',
    ],
  },
  {
    title: '12. Alterações e encerramento',
    paragraphs: [
      'Mudanças materiais neste DPA serão publicadas com nova data de versão e comunicadas por meio adequado quando afetarem de forma relevante o tratamento contratado. O uso continuado após a vigência seguirá as regras de atualização previstas nos Termos de Uso.',
      'O controlador pode interromper integrações opcionais ou encerrar o serviço caso não concorde com alteração material, observadas as condições do plano e as obrigações de guarda aplicáveis.',
    ],
  },
  {
    title: '13. Contato',
    paragraphs: [
      'Dúvidas, solicitações sobre este DPA ou comunicações de privacidade podem ser enviadas para usecognia@gmail.com com o assunto “Privacidade”. Para incidentes ou vulnerabilidades, utilize o assunto “Segurança”.',
    ],
  },
]

const subprocessors = [
  ['Railway', 'API, banco PostgreSQL, cache e infraestrutura de mensageria', 'Dados da conta e dados armazenados na plataforma'],
  ['Vercel', 'Hospedagem da interface e encaminhamento seguro de requisições', 'Dados técnicos e dados em trânsito'],
  ['Cloudflare R2', 'Armazenamento privado de anexos, quando habilitado', 'Arquivos previamente criptografados pelo UseCognia'],
  ['Resend', 'E-mails transacionais', 'E-mail, nome e conteúdo necessário da comunicação'],
  ['Google Calendar', 'Sincronização opcional de agenda', 'Data, horário, modalidade e participantes do evento'],
  ['Evolution API / WhatsApp', 'Mensagens e lembretes opcionais', 'Telefone e conteúdo da mensagem configurada'],
  ['Asaas', 'Cobrança e pagamentos', 'Dados cadastrais, do pagador e da transação'],
  ['Groq e Anthropic', 'Recursos opcionais de transcrição e apoio por IA', 'Áudio ou texto selecionado pelo profissional, limitado ao recurso acionado'],
  ['PostHog', 'Métricas de produto sem texto clínico livre', 'Eventos técnicos sanitizados e identificador pseudônimo mediante consentimento'],
]

export default function DpaPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-[#0d1512] dark:text-neutral-100">
      <header className="border-b border-sage-100 bg-white dark:border-white/10 dark:bg-[#101915]">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Link to="/plataforma"><BrandLogo className="h-10 w-auto" /></Link>
          <Link to="/seguranca" className="text-sm font-semibold text-sage-700 hover:text-sage-900 dark:text-sage-300 dark:hover:text-sage-100">
            Segurança
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-5 py-10">
        <p className="text-sm font-medium text-sage-700 dark:text-sage-300">UseCognia</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-neutral-950 dark:text-white">
          Acordo de Tratamento de Dados
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Versão 1.0 · Brasil · Última atualização: julho de 2026
        </p>
        <p className="mt-5 rounded-2xl border border-sage-200 bg-sage-50 px-5 py-4 text-sm leading-6 text-sage-900 dark:border-sage-400/30 dark:bg-sage-500/10 dark:text-sage-100">
          Este documento explica as responsabilidades do profissional e do UseCognia quando a plataforma processa dados de pacientes.
          Ele deve ser lido com os <Link to="/termos" className="font-semibold underline">Termos de Uso</Link> e a{' '}
          <Link to="/privacidade" className="font-semibold underline">Política de Privacidade</Link>.
        </p>

        <div className="mt-8 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-sage-100 bg-white shadow-card dark:divide-white/10 dark:border-white/10 dark:bg-[#17211d]">
          {sections.slice(0, 7).map((section) => (
            <DpaSectionBlock key={section.title} section={section} />
          ))}

          <section className="px-6 py-6">
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
              Suboperadores e transferências internacionais
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              O UseCognia pode contratar suboperadores necessários ao serviço. Alguns fornecedores podem tratar dados fora do Brasil.
              Nesses casos, limitamos os dados à finalidade contratada e buscamos medidas técnicas e contratuais compatíveis com a LGPD.
              Integrações opcionais só recebem dados quando ativadas ou utilizadas pelo controlador.
            </p>
            <div className="mt-5 space-y-3">
              {subprocessors.map(([name, purpose, data]) => (
                <div key={name} className="grid gap-1 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-[9rem_1fr]">
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">{name}</p>
                  <div>
                    <p className="text-neutral-700 dark:text-neutral-200">{purpose}</p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{data}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {sections.slice(7).map((section) => (
            <DpaSectionBlock key={section.title} section={section} />
          ))}
        </div>

        <section className="mt-8 rounded-2xl border border-sage-100 bg-white px-6 py-5 shadow-card dark:border-white/10 dark:bg-[#17211d]">
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Referências oficiais</h2>
          <div className="mt-3 flex flex-col gap-2 text-sm font-semibold text-sage-700 dark:text-sage-300">
            <a href="https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-para-definicoes-dos-agentes-de-tratamento-de-dados-pessoais-e-do-encarregado" target="_blank" rel="noreferrer" className="hover:underline">
              Guia de agentes de tratamento da ANPD
            </a>
            <a href="https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis" target="_blank" rel="noreferrer" className="hover:underline">
              Regulamento de incidentes da ANPD
            </a>
            <Link to="/seguranca" className="hover:underline">Controles de segurança do UseCognia</Link>
          </div>
        </section>
      </article>
    </main>
  )
}

function DpaSectionBlock({ section }: { section: DpaSection }) {
  return (
    <section className="px-6 py-5">
      <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">{section.title}</h2>
      {section.paragraphs.map((paragraph) => (
        <p key={paragraph} className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
          {paragraph}
        </p>
      ))}
    </section>
  )
}
