import { Link } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'

// ─── POLÍTICA DE PRIVACIDADE ─────────────────────────────────────────────────

const privacySections: Array<{ title: string; content: string | string[] }> = []

// ─── TERMOS DE USO ───────────────────────────────────────────────────────────

const termsSections: Array<{ title: string; content: string | string[] }> = [
  {
    title: '1. Aceite e Vinculação',
    content: 'Ao criar conta, acessar ou utilizar a plataforma UseCognia, o usuário declara expressamente que leu, compreendeu e concorda com estes Termos de Uso ("Termos"). Caso não concorde, deve cessar o uso da plataforma imediatamente.',
  },
  {
    title: '2. Objeto',
    content: 'A UseCognia oferece plataforma SaaS para psicólogos, psicanalistas, psiquiatras e clínicas de saúde mental, com ferramentas de gestão de agenda, pacientes, prontuários, documentos clínicos, financeiro, comunicação e relatórios. A plataforma não presta atendimento psicológico ou clínico e não substitui a responsabilidade profissional do usuário.',
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
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-sage-100 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Link to="/plataforma"><BrandLogo className="h-10 w-auto" /></Link>
          <Link to="/cadastro" className="btn-primary text-sm">Começar</Link>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-5 py-10">
        <p className="text-sm font-medium text-sage-700">UseCognia</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-neutral-950">
          {isPrivacy ? 'Política de Privacidade' : 'Termos de Uso'}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {isPrivacy
            ? ''
            : 'Versão 2.0 · Brasil · Última atualização: junho de 2025'}
        </p>

        {isPrivacy && <div className="min-h-[420px]" />}

        {!isPrivacy && <div className="mt-8 space-y-0 divide-y divide-neutral-100 rounded-2xl border border-sage-100 bg-white shadow-card overflow-hidden">
          {sections.map((section) => (
            <section key={section.title} className="px-6 py-5">
              <h2 className="font-semibold text-neutral-900 mb-3">{section.title}</h2>
              {Array.isArray(section.content)
                ? section.content.map((paragraph, i) => (
                    <p key={i} className="mt-2 text-sm leading-relaxed text-neutral-600 whitespace-pre-line">
                      {paragraph}
                    </p>
                  ))
                : (
                    <p className="text-sm leading-relaxed text-neutral-600 whitespace-pre-line">
                      {section.content}
                    </p>
              )}
            </section>
          ))}
        </div>}

      </article>
    </main>
  )
}
