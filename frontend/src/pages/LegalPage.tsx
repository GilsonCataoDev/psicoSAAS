import { Link } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'

// ─── POLÍTICA DE PRIVACIDADE ─────────────────────────────────────────────────

const privacySections: Array<{ title: string; content: string | string[] }> = [
  {
    title: '1. Sobre esta política',
    content: 'Esta Política de Privacidade explica como o UseCognia trata dados pessoais na plataforma. Ela deve ser lida junto dos Termos de Uso. O UseCognia fornece tecnologia de gestão para profissionais de saúde mental e não substitui as obrigações éticas, profissionais ou legais de quem realiza o atendimento.',
  },
  {
    title: '2. Papéis no tratamento de dados',
    content: 'Para os dados cadastrais da conta, cobrança, suporte e segurança, o UseCognia toma decisões necessárias à operação da plataforma. Em relação aos dados de pacientes inseridos pelo profissional, o profissional ou a clínica define a finalidade e atua como controlador; o UseCognia trata esses dados para prestar o serviço, na condição de operador, conforme as instruções e configurações da conta.',
  },
  {
    title: '3. Dados tratados',
    content: [
      'Podemos tratar dados da conta, como nome, e-mail, telefone, registro profissional, preferências, plano e histórico de acesso.',
      'Quando o profissional utiliza os módulos clínicos, a plataforma pode armazenar dados de pacientes, agenda, sessões, prontuários, documentos, instrumentos, anexos e informações financeiras. Esses registros podem incluir dados pessoais sensíveis relativos à saúde.',
      'Também tratamos dados técnicos indispensáveis à segurança e ao funcionamento, como endereço IP, navegador, dispositivo, data, horário, eventos de autenticação e trilhas de auditoria.',
    ],
  },
  {
    title: '4. Finalidades e bases legais',
    content: 'Os dados são utilizados para criar e autenticar contas, prestar as funcionalidades contratadas, proteger a plataforma, oferecer suporte, processar pagamentos, cumprir obrigações legais e prevenir fraude. Conforme o contexto, o tratamento pode se apoiar na execução de contrato, cumprimento de obrigação legal ou regulatória, exercício regular de direitos, legítimo interesse e consentimento quando exigido. O profissional é responsável por definir e documentar a base legal aplicável aos dados de seus pacientes.',
  },
  {
    title: '5. Compartilhamento e fornecedores',
    content: 'Os dados são compartilhados somente quando necessário à prestação do serviço, à segurança ou ao cumprimento da lei. A infraestrutura utiliza Vercel para a interface e Railway/PostgreSQL para aplicação e banco de dados. Recursos opcionais podem envolver Asaas, Resend, Google Calendar, WhatsApp e provedores de monitoramento. Cada integração recebe apenas os dados necessários para sua função e pode estar sujeita aos próprios termos. Não vendemos prontuários nem utilizamos conteúdo clínico para publicidade.',
  },
  {
    title: '6. Transferência internacional',
    content: 'Alguns fornecedores de infraestrutura e integrações podem processar dados fora do Brasil. Nesses casos, buscamos utilizar fornecedores com medidas contratuais e técnicas adequadas e limitar os dados ao necessário para a execução do serviço.',
  },
  {
    title: '7. Segurança',
    content: 'Adotamos HTTPS/TLS, autenticação individual, cookies de sessão HttpOnly, proteção CSRF, limitação de tentativas, isolamento de dados por conta, criptografia de campos clínicos sensíveis, validação de entradas e arquivos, trilhas de auditoria e verificações automáticas antes de alterações. Nenhum sistema é invulnerável; detalhes e limitações atuais estão publicados na página de Segurança.',
  },
  {
    title: '8. Retenção, exportação e exclusão',
    content: 'A conta oferece recurso de exportação dos dados. A exclusão deve considerar as obrigações de guarda de prontuários e documentos previstas pelas normas profissionais aplicáveis. Antes de encerrar uma conta, o profissional deve exportar e preservar os registros que precise manter. Dados técnicos, financeiros ou de auditoria poderão ser retidos pelo prazo necessário ao cumprimento de obrigação legal, prevenção de fraude e exercício regular de direitos.',
  },
  {
    title: '9. Direitos dos titulares',
    content: 'O titular pode solicitar confirmação de tratamento, acesso, correção, portabilidade quando aplicável, informação sobre compartilhamentos, revisão de consentimento e eliminação nos casos permitidos pela lei. Solicitações relacionadas ao prontuário de um paciente devem ser direcionadas primeiro ao profissional ou clínica responsável pelo atendimento. Pedidos sobre a conta UseCognia podem ser enviados ao contato informado abaixo.',
  },
  {
    title: '10. Cookies e analytics',
    content: 'Utilizamos cookies estritamente necessários para autenticação e segurança. Podemos coletar eventos operacionais e de uso sem conteúdo clínico para entender o funcionamento da plataforma. A gravação automática de sessão está desativada. Preferências e origem de campanha podem ser mantidas localmente no navegador.',
  },
  {
    title: '11. Incidentes e contato',
    content: 'Dúvidas, solicitações de privacidade ou relatos de vulnerabilidade podem ser enviados para contato@usecognia.com.br, com o assunto “Privacidade” ou “Segurança”. Incidentes confirmados serão avaliados e comunicados aos envolvidos e às autoridades quando exigido pela legislação aplicável.',
  },
  {
    title: '12. Atualizações',
    content: 'Esta política pode ser atualizada para refletir mudanças legais, técnicas ou operacionais. Alterações relevantes serão comunicadas por meio adequado. Versão 1.0 — última atualização: julho de 2026.',
  },
]

// ─── TERMOS DE USO ───────────────────────────────────────────────────────────

const termsSections: Array<{ title: string; content: string | string[] }> = [
  {
    title: '1. Aceite e Vinculação',
    content: 'Ao criar conta, acessar ou utilizar a plataforma UseCognia, o usuário declara expressamente que leu, compreendeu e concorda com estes Termos de Uso ("Termos"). Caso não concorde, deve cessar o uso da plataforma imediatamente.',
  },
  {
    title: '2. Objeto',
    content: 'A UseCognia oferece plataforma SaaS para psicólogos, terapeutas, psicanalistas, psiquiatras e clínicas de saúde mental, com ferramentas de gestão de agenda, pacientes, prontuários, documentos clínicos, financeiro, comunicação e relatórios. A plataforma não presta atendimento psicológico ou clínico e não substitui a responsabilidade profissional do usuário.',
  },
  {
    title: '3. Elegibilidade',
    content: 'A plataforma destina-se a profissionais legalmente habilitados a exercer sua profissão no Brasil e a clínicas regularmente constituídas. O usuário declara ser maior de 18 anos, possuir capacidade legal plena e registro profissional válido.',
  },
  {
    title: '4. Responsabilidades do Usuário',
    content: [
      'O usuário é responsável por:\n\n• Manter credenciais de acesso em sigilo e comunicar imediatamente qualquer uso não autorizado;\n• Inserir informações verdadeiras e manter seus dados cadastrais atualizados;\n• Cumprir as normas do CFP, o Código de Ética do Psicólogo e a legislação profissional aplicável;\n• Manter cópia de segurança de seus dados clínicos (prontuários, documentos) independentemente da plataforma;\n• Exportar seus dados antes de solicitar o encerramento da conta.',
    ],
  },
  {
    title: '5. Responsabilidades da UseCognia',
    content: 'A UseCognia compromete-se a: disponibilizar a plataforma conforme o plano contratado; adotar medidas razoáveis de segurança; prestar suporte técnico conforme canais disponíveis; comunicar indisponibilidades relevantes; e atualizar os Termos com aviso prévio adequado.',
  },
  {
    title: '6. Uso Proibido',
    content: 'É vedado ao usuário: utilizar a plataforma para fins ilícitos ou contrários à ética profissional; acessar dados de terceiros sem autorização; compartilhar credenciais de acesso; praticar engenharia reversa, scraping ou extração automatizada de dados; inserir código malicioso; violar sigilo profissional; tentar comprometer a infraestrutura ou a segurança da plataforma; e usar a plataforma para fins distintos dos previstos nestes Termos.',
  },
  {
    title: '7. Planos, Preços e Pagamentos',
    content: 'A plataforma pode oferecer planos gratuitos, pagos e períodos de teste. Recursos, limites e valores são definidos conforme o plano e podem ser alterados mediante aviso prévio. O pagamento é processado por provedor terceirizado. A UseCognia não armazena dados completos de cartão de crédito.',
  },
  {
    title: '8. Cancelamento e Reembolso',
    content: 'O usuário pode cancelar a assinatura a qualquer momento pelos meios disponíveis na plataforma. O acesso permanece ativo até o término do período pago. Reembolsos por arrependimento no prazo de 7 dias corridos (conforme CDC) ou por cobrança indevida serão processados conforme a lei. Demais pedidos de reembolso serão analisados caso a caso.',
  },
  {
    title: '9. Suspensão e Encerramento',
    content: 'A UseCognia pode suspender ou encerrar contas em caso de: inadimplência; fraude ou suspeita fundamentada de fraude; violação destes Termos; risco à segurança de outros usuários ou da infraestrutura; ou por determinação de autoridade competente. Em situações de risco grave, a suspensão pode ser imediata; nos demais casos, o usuário será notificado com antecedência razoável.',
  },
  {
    title: '10. Propriedade Intelectual',
    content: 'Marca, logotipo, código-fonte, design, fluxos, funcionalidades, textos e demais elementos da plataforma são de titularidade da UseCognia ou de seus licenciadores. O usuário recebe licença pessoal, intransferível, não exclusiva e revogável para utilizar a plataforma conforme estes Termos. Os dados inseridos pelo usuário pertencem a ele e aos titulares correspondentes.',
  },
  {
    title: '11. Dados, Exportação e Exclusão',
    content: 'O usuário pode exportar seus dados e os dados de pacientes por meio da funcionalidade de exportação da plataforma. Arquivos exportados podem conter dados sensíveis e devem ser protegidos com os cuidados exigidos para prontuários.',
  },
  {
    title: '12. Limitação de Responsabilidade',
    content: 'Na extensão permitida pela legislação brasileira, a UseCognia não responde por: decisões clínicas do profissional; conteúdo inserido na plataforma; danos decorrentes de falhas de dispositivos ou redes do usuário; uso indevido de credenciais; danos indiretos, lucros cessantes ou danos morais não decorrentes de conduta culposa ou dolosa da UseCognia. A responsabilidade total da UseCognia em qualquer evento está limitada ao valor pago pelo usuário nos últimos 12 meses, salvo disposição legal em contrário.',
  },
  {
    title: '13. Modificação dos Termos',
    content: 'A UseCognia pode atualizar estes Termos periodicamente. Alterações relevantes serão comunicadas com antecedência mínima de 15 dias por e-mail ou aviso na plataforma. O uso continuado após a data de vigência implica aceitação dos novos Termos.',
  },
  {
    title: '14. Legislação e Foro',
    content: 'Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca da sede da UseCognia para resolução de conflitos, salvo disposição legal que estabeleça foro obrigatório diferente, como o domicílio do consumidor nos termos do CDC.',
  },
]

// ─── Componente ──────────────────────────────────────────────────────────────

export default function LegalPage({ type }: { type: 'privacy' | 'terms' }) {
  const isPrivacy = type === 'privacy'
  const sections = isPrivacy ? privacySections : termsSections

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 transition-colors dark:bg-[#0d1512] dark:text-neutral-100">
      <header className="border-b border-sage-100 bg-white dark:border-white/10 dark:bg-[#101915]">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Link to="/plataforma"><BrandLogo className="h-10 w-auto" /></Link>
          <Link to="/cadastro" className="btn-primary text-sm">Começar</Link>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-5 py-10">
        <p className="text-sm font-medium text-sage-700">UseCognia</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-neutral-950 dark:text-white">
          {isPrivacy ? 'Política de Privacidade' : 'Termos de Uso'}
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          {isPrivacy
            ? 'Versão 1.0 · Brasil · Última atualização: julho de 2026'
            : 'Versão 2.0 · Brasil · Última atualização: junho de 2025'}
        </p>

        <div className="mt-8 space-y-0 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-sage-100 bg-white shadow-card dark:divide-white/10 dark:border-white/10 dark:bg-[#17211d]">
          {sections.map((section) => (
            <section key={section.title} className="px-6 py-5 transition-colors dark:hover:bg-white/[0.025]">
              <h2 className="mb-3 font-semibold text-neutral-900 dark:text-neutral-100">{section.title}</h2>
              {Array.isArray(section.content)
                ? section.content.map((paragraph, i) => (
                    <p key={i} className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                      {paragraph}
                    </p>
                  ))
                : (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                      {section.content}
                    </p>
              )}
            </section>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-sage-700 dark:text-sage-300">
          <Link to="/seguranca" className="hover:text-sage-900 dark:hover:text-sage-100">Conheça os controles de segurança</Link>
          <a href="mailto:contato@usecognia.com.br" className="hover:text-sage-900 dark:hover:text-sage-100">Falar sobre privacidade</a>
        </div>

      </article>
    </main>
  )
}
