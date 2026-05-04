import { Link } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'

const privacySections = [
  ['1. Apresentacao', 'A UseCognia e uma plataforma SaaS para psicologos e clinicas de saude mental. Tratamos dados pessoais para operar a conta, agenda, pacientes, prontuarios, financeiro, documentos, comunicacao e seguranca da plataforma.'],
  ['2. Dados coletados', 'Podemos tratar nome, e-mail, telefone, CRP, especialidade, dados de assinatura, logs tecnicos, preferencias e dados de suporte. Os usuarios podem inserir dados de pacientes, incluindo nome, contato, agenda, historico de sessoes, financeiro, documentos, prontuario e dados sensiveis relacionados a saude mental.'],
  ['3. Finalidades', 'Usamos dados para executar o contrato, manter a plataforma, autenticar usuarios, prestar suporte, processar assinaturas, melhorar seguranca, cumprir obrigacoes legais e permitir exportacao de dados.'],
  ['4. Bases legais', 'As bases legais podem incluir execucao de contrato, cumprimento de obrigacao legal, legitimo interesse, consentimento, exercicio regular de direitos e, para dados sensiveis de saude inseridos pelo profissional, as bases aplicaveis definidas pelo controlador.'],
  ['5. Papel da UseCognia', 'Para dados da conta do profissional, a UseCognia atua como controladora. Para dados de pacientes inseridos pelo profissional ou clinica, em regra a UseCognia atua como operadora, seguindo instrucoes do usuario controlador.'],
  ['6. Compartilhamento', 'Podemos compartilhar dados com provedores de infraestrutura, hospedagem, banco de dados, e-mail, pagamentos, seguranca, suporte e autoridades quando houver obrigacao legal. A UseCognia nao vende dados pessoais.'],
  ['7. Seguranca', 'Adotamos medidas tecnicas e administrativas, incluindo controle de acesso, criptografia quando aplicavel, logs, backups e boas praticas de desenvolvimento seguro. Nenhum sistema e absolutamente imune a riscos.'],
  ['8. Retencao', 'Os dados sao mantidos pelo tempo necessario para operar a plataforma, cumprir obrigacoes legais, atender solicitacoes, preservar seguranca e exercer direitos. Dados podem ser excluidos, anonimizados ou bloqueados ao final da finalidade.'],
  ['9. Direitos dos titulares', 'Titulares podem solicitar confirmacao de tratamento, acesso, correcao, eliminacao, anonimização, bloqueio, portabilidade, informacoes sobre compartilhamento, revogacao de consentimento e oposicao quando aplicavel.'],
  ['10. Cookies', 'Usamos cookies essenciais para autenticacao, seguranca e funcionamento. Cookies analiticos ou de terceiros, quando utilizados, seguirao a legislacao aplicavel.'],
  ['11. Transferencia internacional', 'Servicos de nuvem, seguranca, e-mail ou pagamentos podem envolver transferencia internacional, observadas as salvaguardas da LGPD.'],
  ['12. Contato do encarregado', 'Solicitacoes de privacidade podem ser enviadas para suporte@usecognia.com. Encarregado/DPO: a definir.'],
]

const termsSections = [
  ['1. Aceite', 'Ao criar conta ou usar a UseCognia, o usuario declara que leu e aceita estes Termos de Uso e a Politica de Privacidade.'],
  ['2. Objeto', 'A UseCognia oferece ferramentas de gestao para agenda, pacientes, prontuarios, documentos, financeiro, comunicacao e relatorios. A plataforma nao presta atendimento psicologico nem substitui responsabilidade profissional.'],
  ['3. Responsabilidades do usuario', 'O usuario deve manter credenciais seguras, inserir dados verdadeiros, possuir base legal para tratar dados pessoais e sensiveis, cumprir LGPD, normas do CFP e deveres de sigilo profissional.'],
  ['4. Responsabilidades da plataforma', 'A UseCognia deve disponibilizar o servico conforme o plano contratado, adotar medidas razoaveis de seguranca, prestar suporte e corrigir falhas tecnicas conforme viabilidade.'],
  ['5. Uso proibido', 'E proibido usar a plataforma para fins ilicitos, acessar dados de terceiros, compartilhar credenciais, violar sigilo, enviar spam, inserir codigos maliciosos ou comprometer a infraestrutura.'],
  ['6. Planos e pagamentos', 'A plataforma pode oferecer planos gratuitos, pagos e testes. Recursos, limites e valores variam conforme o plano. A cobranca pode ocorrer por provedor de pagamento terceirizado.'],
  ['7. Cancelamento e reembolso', 'O usuario pode cancelar a assinatura pelos meios disponiveis. O acesso pode permanecer ate o fim do periodo pago. Reembolsos serao avaliados conforme oferta, lei aplicavel e eventual cobranca indevida.'],
  ['8. Suspensao', 'A UseCognia pode suspender ou encerrar contas em caso de inadimplencia, fraude, risco de seguranca, violacao destes Termos ou ordem de autoridade competente.'],
  ['9. Propriedade intelectual', 'Marca, codigo, layout, fluxos, textos, design e funcionalidades pertencem a UseCognia ou licenciadores. O usuario recebe licenca limitada de uso.'],
  ['10. Limitacao de responsabilidade', 'A UseCognia nao responde por decisoes clinicas, conteudo inserido pelo usuario, falhas de terceiros, uso indevido de credenciais, internet, dispositivos ou danos indiretos, salvo exigencia legal.'],
  ['11. Dados e exportacao', 'O usuario pode exportar seus dados quando a funcionalidade estiver disponivel e sera responsavel pela guarda segura dos arquivos exportados, especialmente quando contiverem dados sensiveis.'],
  ['12. Legislacao e foro', 'Estes Termos sao regidos pelas leis do Brasil. Fica eleito o foro da comarca a ser definida pela empresa, salvo regras legais de competencia obrigatoria.'],
]

export default function LegalPage({ type }: { type: 'privacy' | 'terms' }) {
  const isPrivacy = type === 'privacy'
  const sections = isPrivacy ? privacySections : termsSections

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-sage-100 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Link to="/venda"><BrandLogo className="h-10 w-auto" /></Link>
          <Link to="/cadastro" className="btn-primary text-sm">Comecar</Link>
        </div>
      </header>
      <article className="mx-auto max-w-4xl px-5 py-10">
        <p className="text-sm font-medium text-sage-700">UseCognia</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-neutral-950">
          {isPrivacy ? 'Politica de Privacidade' : 'Termos de Uso'}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">Versao 1.0 · Brasil · Contato: suporte@usecognia.com</p>
        <div className="mt-8 space-y-5 rounded-2xl border border-sage-100 bg-white p-6 shadow-card">
          {sections.map(([title, text]) => (
            <section key={title}>
              <h2 className="font-semibold text-neutral-900">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">{text}</p>
            </section>
          ))}
        </div>
      </article>
    </main>
  )
}
