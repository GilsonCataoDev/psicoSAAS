import { Link } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'

// ─── POLÍTICA DE PRIVACIDADE ─────────────────────────────────────────────────

const privacySections: Array<{ title: string; content: string | string[] }> = [
  {
    title: '1. Identificação e Apresentação',
    content: [
      'A presente Política de Privacidade ("Política") é disponibilizada por UseCognia ("UseCognia", "nós", "nosso"), plataforma SaaS voltada a psicólogos, psicanalistas, psiquiatras e clínicas de saúde mental.',
      'Razão Social: a definir conforme registro empresarial.\nCNPJ: a definir.\nEndereço: Brasil.\nContato de privacidade: privacidade@usecognia.com',
      'Esta Política descreve como tratamos dados pessoais de profissionais usuários da plataforma, de seus pacientes e de visitantes, em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados — LGPD), o Marco Civil da Internet (Lei nº 12.965/2014), o Código de Defesa do Consumidor (Lei nº 8.078/1990), as resoluções do Conselho Federal de Psicologia (CFP) e demais normas aplicáveis.',
      'Ao criar conta, utilizar a plataforma ou inserir dados de terceiros, o usuário declara ter lido e compreendido esta Política.',
    ],
  },
  {
    title: '2. Definições',
    content: [
      'Para fins desta Política, aplicam-se os seguintes conceitos:\n\n• Dado pessoal: informação relacionada a pessoa natural identificada ou identificável.\n• Dado sensível: dado sobre origem racial, convicção religiosa, opinião política, saúde, vida sexual, dado genético ou biométrico.\n• Titular: pessoa natural a quem os dados se referem.\n• Controlador: pessoa que decide sobre o tratamento de dados.\n• Operador: pessoa que realiza o tratamento em nome do controlador.\n• Encarregado (DPO): pessoa indicada para atuar como canal de comunicação entre controlador, titulares e a ANPD.\n• Tratamento: toda operação com dados pessoais (coleta, uso, acesso, armazenamento, compartilhamento, exclusão etc.).\n• ANPD: Autoridade Nacional de Proteção de Dados.\n• Prontuário: registro clínico de paciente elaborado pelo profissional de saúde.\n• Suboperador: terceiro contratado pela UseCognia para auxiliar nas operações de tratamento.',
    ],
  },
  {
    title: '3. Dados Coletados',
    content: [
      '3.1 Dados dos Profissionais e Clínicas (conta do usuário)\nNome completo, e-mail, telefone, número de registro profissional (CRP ou equivalente), especialidade, dados de faturamento e assinatura (processados por provedor de pagamentos), endereço da clínica, preferências da plataforma, logs de acesso e atividade, endereço IP, identificadores de dispositivo, dados de suporte técnico e comunicações.',
      '3.2 Dados de Pacientes inseridos pelo Profissional\nNome, data de nascimento, CPF (opcional), contato, endereço, histórico de sessões, valores e pagamentos, documentos clínicos, prontuário psicológico, anotações de evolução, hipóteses diagnósticas, plano terapêutico, resultados de instrumentos clínicos aplicados e demais informações clínicas sensíveis inseridas pelo profissional no exercício de sua atividade.',
      '3.3 Dados coletados automaticamente\nCookies essenciais, tokens de sessão, logs técnicos de acesso e erro, dados de desempenho e estabilidade da plataforma. Não coletamos deliberadamente conteúdo clínico por meios automáticos.',
      '3.4 Dados de visitantes públicos\nEndereço IP, dados de navegação nas páginas públicas e formulários de contato ou agendamento público.',
    ],
  },
  {
    title: '4. Finalidades do Tratamento',
    content: [
      'Os dados tratados pela UseCognia têm as seguintes finalidades:\n\n• Executar o contrato de prestação de serviço SaaS e disponibilizar os recursos da plataforma;\n• Autenticar usuários e garantir o acesso seguro às contas;\n• Processar assinaturas, cobranças e transações financeiras;\n• Prestar suporte técnico e atendimento ao cliente;\n• Enviar comunicações operacionais (alterações de serviço, atualizações de segurança, notas de versão);\n• Enviar comunicações de marketing com base em consentimento ou legítimo interesse, com opção de descadastramento;\n• Prevenir fraudes, abusos, acessos não autorizados e ameaças de segurança;\n• Cumprir obrigações legais e regulatórias;\n• Viabilizar a exportação, portabilidade e exclusão de dados pelo próprio usuário;\n• Melhorar a estabilidade, usabilidade e segurança da plataforma com base em análise de uso agregada e anonimizada;\n• Registrar e armazenar prontuários e documentos clínicos conforme instruções do profissional controlador.',
    ],
  },
  {
    title: '5. Bases Legais',
    content: [
      '5.1 Para dados dos profissionais (controladora)\nA UseCognia trata dados de profissionais com base em:\n\n• Art. 7º, V — Execução de contrato: para provisionar e operar a plataforma;\n• Art. 7º, VI — Exercício regular de direitos;\n• Art. 7º, IX — Legítimo interesse: para segurança, prevenção a fraudes e comunicações operacionais;\n• Art. 7º, I — Consentimento: para comunicações de marketing opcionais;\n• Art. 7º, II — Obrigação legal: para retenção de registros exigida por lei.',
      '5.2 Para dados sensíveis de saúde de pacientes (operadora)\nQuando a UseCognia atua como operadora, o tratamento de dados sensíveis de saúde ocorre conforme instrução do profissional controlador, que deve fundamentar o tratamento nas bases do art. 11 da LGPD, especialmente:\n\n• Art. 11, II, a — Cumprimento de obrigação legal ou regulatória pelo controlador;\n• Art. 11, II, f — Exercício regular de direitos;\n• Art. 11, II, g — Proteção da vida ou incolumidade física do titular;\n• Art. 11, I — Consentimento específico e destacado do titular, quando aplicável.\n\nA UseCognia não define a finalidade nem a base legal do tratamento dos dados dos pacientes, responsabilidade exclusiva do profissional ou clínica controladora.',
    ],
  },
  {
    title: '6. Papel da UseCognia: Controladora e Operadora',
    content: [
      '6.1 Como Controladora\nA UseCognia é controladora dos dados pessoais de profissionais e clínicas usuárias da plataforma (conta, faturamento, suporte, comunicação e logs técnicos), decidindo sobre as finalidades e meios do tratamento.',
      '6.2 Como Operadora\nPara os dados de pacientes inseridos pelo profissional ou clínica, a UseCognia atua como operadora, processando-os exclusivamente conforme instruções do controlador e para fins de operação da plataforma. A UseCognia não acessa, utiliza nem compartilha esses dados além do estritamente necessário para a prestação do serviço.',
      '6.3 Responsabilidades do Profissional Controlador\nO profissional ou clínica que utiliza a UseCognia para inserir e gerir dados de pacientes é responsável por:\n\n• Possuir base legal adequada para o tratamento;\n• Informar os pacientes sobre o uso da plataforma e obter consentimento quando exigível;\n• Responder às solicitações dos titulares referentes aos dados por ele inseridos;\n• Cumprir as normas do CFP sobre prontuário, sigilo e ética profissional;\n• Garantir que o uso da plataforma esteja em conformidade com a LGPD e as normas profissionais aplicáveis;\n• Exportar e guardar os dados em segurança ao encerrar a conta.',
    ],
  },
  {
    title: '7. Compartilhamento e Suboperadores',
    content: [
      'A UseCognia pode compartilhar dados com as seguintes categorias de suboperadores e terceiros, vinculados por contratos que exigem proteção equivalente à desta Política:\n\n• Infraestrutura e hospedagem em nuvem (servidores, banco de dados, armazenamento de arquivos);\n• Processadores de pagamento e antifraude;\n• Serviço de envio de e-mails transacionais e notificações;\n• Ferramentas de monitoramento de erros e desempenho de aplicações;\n• Ferramentas de analytics de uso (dados agregados e mascarados, sem captura de conteúdo clínico);\n• Suporte técnico e atendimento ao cliente, quando necessário para resolver chamados;\n• Autoridades públicas, órgãos reguladores e o Poder Judiciário, quando houver obrigação legal, decisão judicial ou administrativa.',
      'A UseCognia não vende, não aluga e não comercializa dados pessoais a terceiros para fins publicitários ou de qualquer outra natureza.',
    ],
  },
  {
    title: '8. Transferência Internacional de Dados',
    content: [
      'Alguns suboperadores utilizados pela UseCognia podem estar localizados fora do Brasil ou processar dados em servidores internacionais, incluindo serviços de hospedagem em nuvem, monitoramento, e-mail e analytics.',
      'Nessas situações, a UseCognia adota salvaguardas adequadas, podendo incluir:\n\n• Cláusulas-padrão contratuais aprovadas pela ANPD ou adotadas segundo boas práticas internacionais;\n• Transferência para países com nível adequado de proteção reconhecido pela ANPD;\n• Certificações de conformidade dos fornecedores (ex.: ISO 27001, SOC 2);\n• Cláusulas contratuais específicas de proteção de dados.',
      'Os principais fornecedores com eventual operação internacional são informados mediante solicitação ao canal de privacidade.',
    ],
  },
  {
    title: '9. Cookies e Tecnologias de Rastreamento',
    content: [
      '9.1 Cookies essenciais\nUtilizamos cookies estritamente necessários para o funcionamento da plataforma, incluindo autenticação de sessão, proteção contra CSRF, preferências de interface e segurança. Esses cookies não podem ser desativados sem prejudicar o funcionamento da plataforma.',
      '9.2 Cookies de desempenho e analytics\nPodemos utilizar ferramentas de analytics para compreender como a plataforma é utilizada, com dados agregados e, quando possível, anonimizados. Entradas de formulários clínicos não são capturadas por essas ferramentas. Cookies de analytics podem ser desativados mediante solicitação ao canal de privacidade ou configuração do navegador.',
      '9.3 Ausência de cookies de marketing\nA UseCognia não utiliza cookies de rastreamento para fins publicitários de terceiros na plataforma autenticada.',
    ],
  },
  {
    title: '10. Segurança da Informação',
    content: [
      'A UseCognia adota medidas técnicas e organizacionais proporcionais ao risco e à sensibilidade dos dados tratados, incluindo:\n\n• Comunicação exclusivamente via HTTPS/TLS;\n• Cookies HttpOnly e atributo Secure;\n• Proteção contra CSRF (tokens de validação de origem);\n• Controle de acesso baseado em autenticação e autorização por conta;\n• Isolamento de dados por psicólogo/clínica (cada usuário acessa apenas seus dados);\n• Hashing seguro de senhas (bcrypt);\n• Criptografia em repouso para campos sensíveis;\n• Logs técnicos de acesso e auditoria;\n• Backups automatizados com retenção configurada;\n• Boas práticas de desenvolvimento seguro (OWASP);\n• Rate limiting e proteção contra ataques de força bruta;\n• Monitoramento contínuo de erros e disponibilidade.',
      'Nenhum sistema de segurança é absolutamente inviolável. A UseCognia compromete-se a adotar medidas razoáveis e a comunicar incidentes conforme disposto nesta Política.',
    ],
  },
  {
    title: '11. Incidentes de Segurança',
    content: [
      'Em caso de incidente de segurança que resulte em acesso não autorizado, destruição, perda, alteração, comunicação ou qualquer forma de tratamento inadequado de dados pessoais, a UseCognia adotará as seguintes medidas:\n\n1. Contenção imediata do incidente e preservação de evidências;\n2. Avaliação do escopo, natureza e impacto do incidente;\n3. Comunicação à ANPD em prazo razoável quando o incidente puder acarretar risco ou dano relevante aos titulares, conforme art. 48 da LGPD;\n4. Comunicação aos titulares afetados quando o incidente puder acarretar risco ou dano relevante;\n5. Adoção de medidas corretivas para evitar reincidência;\n6. Registro interno do incidente e das providências adotadas.',
      'Para comunicar suspeitas de incidentes de segurança, entre em contato com privacidade@usecognia.com.',
    ],
  },
  {
    title: '12. Retenção e Descarte de Dados',
    content: [
      '12.1 Critérios de retenção\nOs dados são mantidos pelo tempo necessário para a finalidade que os originou, observados os seguintes critérios:\n\n• Dados de conta ativa: durante toda a vigência do contrato de serviço;\n• Logs técnicos de acesso: até 12 meses, salvo obrigação legal distinta;\n• Dados de suporte: até 24 meses após o encerramento do chamado;\n• Dados de faturamento e transações: conforme exigência fiscal e contábil (mínimo 5 anos);\n• Dados de pacientes: conforme instrução do profissional controlador; após exclusão da conta, conforme item 12.3;\n• Prontuários e documentos clínicos: sujeitos às normas do CFP (Resolução CFP nº 01/2009 e demais normativas) e ao prazo definido pelo profissional controlador.',
      '12.2 Backups\nBackups automatizados são realizados periodicamente para garantir a recuperação de dados em caso de falha. Backups podem reter dados por período adicional após a exclusão da conta, geralmente até 90 dias, findo o qual os dados são descartados de forma segura. O usuário não possui acesso direto a backups; a recuperação de dados de backups está sujeita à viabilidade técnica e a critérios de segurança.',
      '12.3 Descarte e anonimização\nApós o prazo de retenção aplicável, os dados são descartados de forma segura (deleção irreversível) ou anonimizados, de modo que não possam ser associados ao titular. Dados sujeitos a litígios ou investigações em curso podem ser preservados pelo tempo necessário.',
    ],
  },
  {
    title: '13. Prontuários Psicológicos e Documentos Clínicos',
    content: [
      'O prontuário psicológico e os documentos clínicos inseridos na plataforma são de titularidade do paciente e responsabilidade do profissional, nos termos das normas do CFP.',
      'A UseCognia, na qualidade de operadora, armazena esses registros exclusivamente para permitir que o profissional exerça sua atividade clínica. A plataforma não interpreta, analisa ou utiliza o conteúdo clínico para qualquer outra finalidade.',
      'O profissional é responsável por:\n\n• Manter o prontuário completo, legível e atualizado;\n• Guardar cópia local dos prontuários conforme as normas do CFP;\n• Informar o paciente sobre o armazenamento digital do prontuário;\n• Adotar as medidas de sigilo profissional previstas no Código de Ética do Psicólogo.\n\nRecomendamos que o profissional exporte regularmente seus dados clínicos por meio da funcionalidade de exportação disponível na plataforma.',
    ],
  },
  {
    title: '14. Direitos dos Titulares',
    content: [
      'Nos termos do art. 18 da LGPD, o titular de dados pessoais tem direito a:\n\n• Confirmação da existência de tratamento;\n• Acesso aos dados;\n• Correção de dados incompletos, inexatos ou desatualizados;\n• Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a LGPD;\n• Portabilidade dos dados a outro fornecedor de serviço ou produto;\n• Eliminação dos dados pessoais tratados com base no consentimento;\n• Informação sobre as entidades públicas e privadas com as quais a UseCognia compartilhou dados;\n• Informação sobre a possibilidade de não fornecer consentimento e as consequências;\n• Revogação do consentimento a qualquer tempo;\n• Oposição ao tratamento realizado com base em legítimo interesse.',
      'Para dados de pacientes inseridos por profissionais: quando a solicitação do paciente envolver dados sob controle do profissional ou clínica, a UseCognia informará o titular para que contacte o profissional controlador responsável. A UseCognia apoiará tecnicamente o controlador no exercício desses direitos.',
    ],
  },
  {
    title: '15. Como Exercer Seus Direitos',
    content: [
      'Para exercer os direitos previstos na LGPD, o titular pode:\n\n1. Enviar solicitação para privacidade@usecognia.com com o assunto "Direitos LGPD";\n2. Identificar-se com nome completo e e-mail cadastrado;\n3. Descrever o direito que deseja exercer e as informações relevantes.\n\nA UseCognia responderá em até 15 dias úteis, podendo prorrogar por igual período mediante justificativa. Solicitações que dependam de verificação de identidade ou de prazo de retenção legal serão respondidas com informação sobre o procedimento aplicável.',
      'Caso o titular entenda que seus direitos não foram atendidos, poderá apresentar reclamação à ANPD (www.gov.br/anpd).',
    ],
  },
  {
    title: '16. Exportação, Portabilidade e Recuperação de Dados',
    content: [
      'O usuário profissional pode exportar seus dados e os dados de pacientes por meio da funcionalidade de exportação disponível na plataforma, em formato estruturado (CSV, PDF ou equivalente).',
      'Dados exportados podem conter informações sensíveis de saúde e devem ser armazenados e protegidos pelo usuário com os mesmos cuidados exigidos para prontuários físicos.',
      'A portabilidade dos dados a outro fornecedor, quando solicitada formalmente, será providenciada em formato interoperável, conforme regulamentação da ANPD.',
    ],
  },
  {
    title: '17. Encerramento de Conta e Consequências para os Dados',
    content: [
      'Ao solicitar o encerramento da conta, o usuário deve previamente exportar seus dados. Após a confirmação do encerramento:\n\n1. O acesso à conta é desativado imediatamente;\n2. Os dados ativos (pacientes, prontuários, agenda, financeiro, documentos) são marcados para exclusão;\n3. A exclusão efetiva dos dados dos servidores ativos ocorre em até 30 dias úteis;\n4. Backups podem reter os dados por até 90 dias adicionais, sendo descartados de forma segura ao final desse período;\n5. Dados de faturamento e registros contábeis são mantidos pelo prazo legalmente exigido (mínimo 5 anos);\n6. Dados necessários para defesa em processos judiciais, administrativos ou arbitrais em curso podem ser preservados até a resolução definitiva.',
      'Após o encerramento, os dados não poderão ser recuperados. O usuário é inteiramente responsável por garantir cópia adequada de suas informações antes de solicitar o encerramento.',
    ],
  },
  {
    title: '18. Limitação de Responsabilidade',
    content: [
      'A UseCognia emprega medidas razoáveis de segurança, mas não pode garantir a absoluta inviolabilidade dos sistemas. Em caso de incidente, a responsabilidade da UseCognia estará limitada ao previsto na legislação brasileira aplicável e às cláusulas do contrato de serviço.',
      'A UseCognia não se responsabiliza por:\n\n• Decisões clínicas, diagnósticos ou prescrições do profissional;\n• Conteúdo inserido pelo usuário na plataforma;\n• Falhas de dispositivos, redes ou sistemas do próprio usuário;\n• Uso inadequado de credenciais de acesso;\n• Danos decorrentes de eventos fora do controle razoável da plataforma (caso fortuito, força maior, falhas de infraestrutura de terceiros);\n• Descumprimento, pelo profissional, de suas obrigações legais como controlador dos dados dos pacientes.',
    ],
  },
  {
    title: '19. Encarregado de Dados (DPO)',
    content: [
      'A UseCognia mantém canal de contato para questões de privacidade e proteção de dados. Enquanto a função formal de Encarregado (DPO) não estiver formalizada, as responsabilidades são exercidas pela equipe responsável pela plataforma.',
      'Canal de privacidade: privacidade@usecognia.com\nAssunto recomendado: "Privacidade/LGPD"\n\nO canal está disponível para:\n• Titulares que desejam exercer seus direitos;\n• Profissionais com dúvidas sobre o tratamento de dados na plataforma;\n• Autoridades e reguladores com demandas relacionadas à proteção de dados.',
    ],
  },
  {
    title: '20. Atualizações desta Política',
    content: [
      'Esta Política pode ser atualizada periodicamente para refletir mudanças na plataforma, na legislação ou nas práticas de segurança. Quando as alterações forem relevantes, notificaremos os usuários por e-mail ou aviso na plataforma com antecedência mínima de 15 dias antes da entrada em vigor.',
      'A versão em vigor é sempre a mais recente publicada em usecognia.com/privacidade. O uso continuado da plataforma após a vigência das alterações implica aceitação da Política atualizada.',
      'Versão atual: 2.0 — Brasil — Última atualização: junho de 2025.',
    ],
  },
]

// ─── TERMOS DE USO ───────────────────────────────────────────────────────────

const termsSections: Array<{ title: string; content: string | string[] }> = [
  {
    title: '1. Aceite e Vinculação',
    content: 'Ao criar conta, acessar ou utilizar a plataforma UseCognia, o usuário declara expressamente que leu, compreendeu e concorda com estes Termos de Uso ("Termos") e com a Política de Privacidade. Caso não concorde, deve cessar o uso da plataforma imediatamente.',
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
      'O usuário é responsável por:\n\n• Manter credenciais de acesso em sigilo e comunicar imediatamente qualquer uso não autorizado;\n• Inserir informações verdadeiras e manter seus dados cadastrais atualizados;\n• Possuir base legal adequada para tratar dados pessoais e sensíveis dos pacientes;\n• Cumprir a LGPD, as normas do CFP, o Código de Ética do Psicólogo e a legislação profissional aplicável;\n• Informar os pacientes sobre o uso da plataforma e obter consentimentos quando exigíveis;\n• Manter cópia de segurança de seus dados clínicos (prontuários, documentos) independentemente da plataforma;\n• Exportar seus dados antes de solicitar o encerramento da conta.',
    ],
  },
  {
    title: '5. Responsabilidades da UseCognia',
    content: 'A UseCognia compromete-se a: disponibilizar a plataforma conforme o plano contratado; adotar medidas razoáveis de segurança; prestar suporte técnico conforme canais disponíveis; comunicar indisponibilidades relevantes; cumprir a Política de Privacidade; e atualizar os Termos com aviso prévio adequado.',
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
    content: 'A UseCognia pode suspender ou encerrar contas em caso de: inadimplência; fraude ou suspeita fundamentada de fraude; violação destes Termos ou da Política de Privacidade; risco à segurança de outros usuários ou da infraestrutura; ou por determinação de autoridade competente. Em situações de risco grave, a suspensão pode ser imediata; nos demais casos, o usuário será notificado com antecedência razoável.',
  },
  {
    title: '10. Propriedade Intelectual',
    content: 'Marca, logotipo, código-fonte, design, fluxos, funcionalidades, textos e demais elementos da plataforma são de titularidade da UseCognia ou de seus licenciadores. O usuário recebe licença pessoal, intransferível, não exclusiva e revogável para utilizar a plataforma conforme estes Termos. Os dados inseridos pelo usuário pertencem a ele e aos titulares correspondentes.',
  },
  {
    title: '11. Dados, Exportação e Exclusão',
    content: 'O usuário pode exportar seus dados e os dados de pacientes por meio da funcionalidade de exportação da plataforma. Arquivos exportados podem conter dados sensíveis e devem ser protegidos com os cuidados exigidos para prontuários. Ao encerrar a conta, os dados são excluídos conforme a Política de Privacidade, podendo ser preservados por obrigação legal, litígio em curso ou período de backup residual.',
  },
  {
    title: '12. Privacidade dos Pacientes e Responsabilidade do Profissional',
    content: 'O profissional ou clínica é o controlador dos dados dos pacientes inseridos na plataforma. É responsabilidade exclusiva do profissional informar os pacientes, obter consentimentos necessários, responder solicitações de exercício de direitos e cumprir as normas do CFP e da LGPD quanto ao sigilo e ao tratamento de dados sensíveis de saúde. A UseCognia atua como operadora e apoia tecnicamente essas operações conforme a Política de Privacidade.',
  },
  {
    title: '13. Limitação de Responsabilidade',
    content: 'Na extensão permitida pela legislação brasileira, a UseCognia não responde por: decisões clínicas do profissional; conteúdo inserido na plataforma; danos decorrentes de falhas de dispositivos ou redes do usuário; uso indevido de credenciais; danos indiretos, lucros cessantes ou danos morais não decorrentes de conduta culposa ou dolosa da UseCognia. A responsabilidade total da UseCognia em qualquer evento está limitada ao valor pago pelo usuário nos últimos 12 meses, salvo disposição legal em contrário.',
  },
  {
    title: '14. Modificação dos Termos',
    content: 'A UseCognia pode atualizar estes Termos periodicamente. Alterações relevantes serão comunicadas com antecedência mínima de 15 dias por e-mail ou aviso na plataforma. O uso continuado após a data de vigência implica aceitação dos novos Termos.',
  },
  {
    title: '15. Legislação e Foro',
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
            ? 'Versão 2.0 · Brasil · Última atualização: junho de 2025 · privacidade@usecognia.com'
            : 'Versão 2.0 · Brasil · Última atualização: junho de 2025'}
        </p>

        {isPrivacy && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Atenção:</strong> Os dados de pacientes inseridos na plataforma são de responsabilidade do profissional ou clínica que os cadastrou. Para solicitações sobre esses dados, contacte diretamente o profissional responsável pelo seu atendimento.
          </div>
        )}

        <div className="mt-8 space-y-0 divide-y divide-neutral-100 rounded-2xl border border-sage-100 bg-white shadow-card overflow-hidden">
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
        </div>

        <div className="mt-8 rounded-xl border border-sage-100 bg-sage-50 px-5 py-4 text-sm text-sage-700">
          <p className="font-semibold mb-1">Canal de Privacidade e Encarregado (DPO)</p>
          <p>Para dúvidas, solicitações de direitos ou comunicações sobre proteção de dados:</p>
          <p className="mt-1">
            E-mail: <a href="mailto:privacidade@usecognia.com" className="underline underline-offset-2">privacidade@usecognia.com</a>
            &nbsp;· Assunto: <strong>Privacidade/LGPD</strong>
          </p>
        </div>
      </article>
    </main>
  )
}
