# Segurança e privacidade no UseCognia

Documento para profissionais que usam (ou avaliam) a plataforma. Escrito para ser
verdadeiro e verificável — descreve o que existe hoje, sem promessas genéricas.

## Onde os dados ficam

- **Aplicação e banco de dados**: Railway (PostgreSQL gerenciado).
- **Interface web**: Vercel.
- Todo o tráfego entre seu navegador e a plataforma usa **HTTPS/TLS**.

## Como sua conta é protegida

- Senhas armazenadas com **Argon2id** (algoritmo recomendado pela OWASP) — nunca em texto puro. Contas antigas com hash bcrypt são migradas automaticamente no próximo login.
- Sessões via cookies **HttpOnly** (inacessíveis a scripts da página), com renovação rotativa: um token de sessão roubado e reutilizado derruba todas as sessões da conta.
- Proteção contra força bruta em três camadas: limite por conta, bloqueio de IPs com ataques a múltiplas contas e um mecanismo de score de risco que bloqueia logins suspeitos.
- Proteção CSRF em todas as operações de escrita.
- Política de senha forte obrigatória (mínimo 8 caracteres com maiúscula, minúscula, número e símbolo).

## Isolamento entre contas

Cada psicólogo só acessa os próprios registros. Isso é aplicado **no servidor, em cada consulta ao banco** — não depende do aplicativo no navegador. Alterar IDs manualmente ou chamar a API diretamente retorna "não encontrado", sem revelar se o registro existe.

Esse isolamento é coberto por **testes automatizados** que simulam duas contas tentando acessar pacientes, sessões, prontuários, documentos, agenda, financeiro e arquivos uma da outra. Esses testes rodam a cada alteração do código.

## Acesso administrativo

Para dar suporte, a operação da plataforma pode usar um modo "ver como" (impersonação) — sempre registrado na trilha de auditoria. Esse modo **não alcança dados de pacientes**: cadastros, agenda, agendamentos, financeiro, prontuários, sessões, anexos, documentos, respostas de instrumentos e exportações integrais ficam bloqueados durante a impersonação. Ficam visíveis apenas informações operacionais da conta, sem sigilo clínico. Ações sensíveis (troca de senha, exclusão de conta e dados de cobrança) também são bloqueadas. Esse bloqueio é coberto por testes automatizados.

## Dados clínicos e de contato

- Prontuários, anotações privadas de sessão, nome e contato de pacientes, nomes de anexos, CPF, data de nascimento, descrições financeiras e dados demográficos sensíveis são **criptografados no banco de dados** (AES-256-GCM, em nível de aplicação) — um acesso direto ao banco não expõe esses campos em texto legível.
- E-mail e telefone de pacientes têm índices cegos HMAC separados por finalidade. Isso permite localizar um cadastro sem guardar uma cópia pesquisável em texto puro.
- Logs do sistema não registram conteúdo clínico.
- Ações sensíveis (visualização de paciente, exportação de prontuário, download de anexos, login) ficam registradas em **trilha de auditoria**.

## Preenchimento facilitado no agendamento

- O nome, e-mail e telefone do paciente **não ficam no `localStorage`** do navegador.
- Se o paciente marcar “lembrar meus dados”, o navegador recebe somente um identificador aleatório em cookie `HttpOnly`, `Secure` e `SameSite=Lax`. Scripts da página não conseguem ler esse identificador.
- Os dados correspondentes ficam criptografados no servidor por até 30 dias. A tela mostra apenas uma prévia mascarada e oferece a ação “Esquecer deste dispositivo”.
- A limpeza automática também remove registros expirados. Chaves antigas do `localStorage` são apagadas quando a página pública é aberta.

## Documentos e links públicos

- Documentos em PDF têm código único e QR de verificação pública de autenticidade.
- Links públicos (agendamento, portal do paciente, instrumentos) usam tokens aleatórios longos, armazenados de forma irreversível (hash) e com limite de tentativas por IP.
- A cópia necessária para o profissional reenviar um link fica criptografada com AES-256-GCM; ela não aparece em texto legível num dump do banco.
- Portais de paciente expiram em 30 dias por padrão. Formulários e confirmações mantêm os prazos menores definidos em cada fluxo.

## Proteções do site público

- A Vercel envia HSTS, `X-Content-Type-Options`, proteção contra incorporação em iframe, política de referência e restrições de permissões do navegador.
- O uso do microfone fica disponível apenas para a própria origem, quando o profissional inicia voluntariamente uma gravação.
- O canal padronizado de divulgação responsável fica publicado em `/.well-known/security.txt`.
- A Política de Privacidade pública descreve papéis, finalidades, fornecedores, direitos, retenção e limitações atuais.

## Textos assistidos por IA

- A partir do plano Essencial, a IA pode organizar transcrições, anotações de prontuário e campos de relatório, atestado ou encaminhamento. Ela gera somente um rascunho; nunca salva, assina ou envia um documento automaticamente.
- Nos documentos, o profissional envia apenas as anotações do campo escolhido. Nome do paciente e dados cadastrais não são buscados nem enviados. O backend também reduz padrões de e-mail, CPF e telefone antes da chamada externa, mas o profissional deve evitar identificadores desnecessários.
- A sugestão aparece separada e só substitui o campo após confirmação explícita. A revisão e a responsabilidade técnica continuam sendo do profissional.
- A franquia mensal compartilhada é aplicada de forma atômica no servidor: 30 textos no Essencial e 150 no Pro por padrão. Os limites podem ser alterados ou desativados com `AI_TEXT_ESSENCIAL_MONTHLY_LIMIT` e `AI_TEXT_PRO_MONTHLY_LIMIT`.
- Falhas do provedor devolvem a reserva da franquia. Tokens e custo estimado das respostas concluídas ficam contabilizados em `ai_usage`; prompts e conteúdo dos rascunhos de documentos não são persistidos pelo UseCognia.

## Copiloto de Raciocínio Clínico Neuropsicológico (plano Pro)

**Finalidade**: apoiar o psicólogo a organizar o raciocínio em avaliações neuropsicológicas — apontar convergências, divergências, funções possivelmente preservadas ou frágeis, hipóteses alternativas e lacunas de informação. **Não é uma ferramenta de diagnóstico** e não corrige testes psicológicos ou neuropsicológicos: não recebe nem processa itens, estímulos, manuais ou tabelas normativas de nenhum instrumento protegido.

**Dados processados**: somente os campos que o profissional escolher incluir na análise (motivo de encaminhamento, história clínica, hipóteses provisórias, observações qualitativas e/ou os registros da bateria de avaliação).

**Redução de identificadores diretos (não é anonimização)**: antes do envio, o backend aplica um filtro de padrões (CPF, RG, telefone, e-mail, CEP, endereço, data de nascimento próxima de palavras-chave, URLs e identificadores internos/UUIDs) e remove ocorrências do nome do paciente cadastrado no texto livre. **Isto é redução de identificadores diretos, por padrões conhecidos — não é anonimização nem garantia de privacidade.** Texto digitado de forma não padronizada, apelidos, erros de digitação ou identificadores fora dos padrões cobertos podem não ser detectados. O profissional não deve, mesmo assim, digitar deliberadamente identificadores desnecessários nos campos analisados.

**Proibido enviar material de teste protegido**: o Copiloto não recebe e não deve receber itens, estímulos, manuais, tabelas normativas ou chaves de correção de nenhum instrumento psicológico ou neuropsicológico protegido. Ele trabalha exclusivamente com o que o profissional registrou sobre o andamento e os resultados já apurados — nunca com o conteúdo do instrumento em si.

**Limites clínicos**: a resposta é sempre uma sugestão estruturada, com linguagem cautelosa, sem diagnóstico definitivo e sem recomendação de conduta como ordem. Cada afirmação relevante indica se é um dado registrado, uma inferência cautelosa ou uma lacuna de informação, e a que campo ou procedimento se refere. Toda resposta inclui um aviso de que foi gerada por IA e precisa ser revisada pelo profissional antes de qualquer uso. Antes do primeiro uso, a interface exige uma confirmação explícita de que os dados selecionados serão processados por um provedor externo de IA.

**Responsabilidade profissional**: a sugestão da IA nunca é aplicada automaticamente à conclusão ou ao relatório final — o profissional decide, campo a campo, o que aproveitar, sempre com confirmação explícita antes de qualquer inclusão no rascunho de integração.

**Uso de provedor externo**: as chamadas usam a API da Anthropic (modelo Claude Haiku), sempre feitas pelo backend — a chave de API nunca é exposta ao navegador ou ao bundle da aplicação. A chamada só ocorre depois de o backend validar, no servidor, que a avaliação pertence ao psicólogo autenticado e que a conta está no plano Pro (`@RequirePlan('pro')`, verificado no servidor — a interface bloqueia visualmente, mas quem impede de fato é o backend).

**Retenção**: o texto enviado ao provedor (prompt) não é armazenado. Apenas a resposta estruturada da IA é persistida, e sempre **criptografada** (AES-256-GCM, com IV/nonce aleatório a cada gravação) — junto de metadados não sensíveis (modelo, versão do prompt, tokens consumidos e custo estimado). Os campos que compuseram cada análise ficam registrados apenas pelo nome do campo (ex.: "história clínica"), nunca pelo conteúdo. Erros de descriptografia nunca retornam conteúdo parcial — o registro é tratado como indisponível.

**Exclusão**: cada análise pode ser excluída individualmente pelo profissional a qualquer momento, de forma definitiva (exclusão permanente, não reversível).

**Limites técnicos e controle de custos** — todos aplicados no servidor, nunca a partir de valores enviados pelo navegador:
- Franquia mensal de análises por conta no plano Pro (`NEUROPSYCH_AI_MONTHLY_LIMIT`, padrão 30/mês), aplicada com contagem atômica no banco — chamadas concorrentes não conseguem ultrapassar o limite.
- Tamanho máximo do registro enviado ao provedor (`NEUROPSYCH_AI_MAX_INPUT_CHARS`, padrão 20.000 caracteres) e teto de tokens de resposta (`NEUROPSYCH_AI_MAX_OUTPUT_TOKENS`, padrão 3.000).
- Timeout da chamada ao provedor (`NEUROPSYCH_AI_TIMEOUT_MS`, padrão 30s).
- Orçamento global mensal, somando todas as contas (`NEUROPSYCH_AI_GLOBAL_MONTHLY_BUDGET_USD`, padrão US$50/mês) — ao ser atingido, novas análises ficam bloqueadas com uma mensagem genérica, sem expor números internos, até o mês seguinte.
- Uma falha do provedor antes de retornar uma resposta não consome a franquia mensal de análises. Já o custo real de uma chamada que o provedor efetivamente processou (mesmo que a resposta tenha vindo em formato inválido) é sempre contabilizado no orçamento — dinheiro gasto é registrado independentemente do resultado ser aproveitável.

**Como desativar**: para desativar o recurso por completo, defina `NEUROPSYCH_AI_MONTHLY_LIMIT=0` (ou `NEUROPSYCH_AI_GLOBAL_MONTHLY_BUDGET_USD=0`) nas variáveis de ambiente do backend — nenhuma conta, independentemente do plano, conseguirá gerar novas análises. O organizador local de rascunho (sem IA) continua disponível normalmente, sem custo.

**Como configurar o orçamento**: todas as variáveis acima ficam documentadas em `backend/.env.example` e devem ser definidas no ambiente de produção (Railway). Não há valor "certo" universal — ajuste `NEUROPSYCH_AI_GLOBAL_MONTHLY_BUDGET_USD` conforme o número de contas Pro ativas e o orçamento de infraestrutura disponível.

## Seus direitos sobre os dados (LGPD)

- **Exportação**: você pode baixar todos os seus dados em PDF pela própria plataforma (`Configurações → Exportar dados`).
- **Exclusão**: a exclusão de conta remove os dados da plataforma. **Atenção**: o Conselho Federal de Psicologia exige guarda de prontuários por prazo mínimo — antes de excluir a conta, exporte seus prontuários e mantenha-os sob sua guarda profissional.
- Na exclusão da conta, anexos e avatar armazenados externamente também precisam ser removidos. Se o provedor de arquivos não confirmar a exclusão, o encerramento é interrompido para evitar deixar arquivos órfãos.
- **Consentimento**: o aceite dos Termos de Uso e da Política de Privacidade é registrado com versão e data.

## Retenção técnica automática

- Logs de entrega de WhatsApp: 7 dias.
- Logs de e-mail: 30 dias.
- Dados opcionais de preenchimento rápido do agendamento: até 30 dias.
- Tentativas de login: 90 dias.
- Trilha técnica de auditoria: 180 dias.

Esses prazos não apagam prontuários ou documentos clínicos do profissional. Registros clínicos permanecem sob o controle da conta e devem observar as obrigações profissionais de guarda.

## Limitações conhecidas (transparência)

- **Não há criptografia de ponta a ponta**: a criptografia é em trânsito (TLS) e em repouso (campo clínico criptografado no banco). A equipe de infraestrutura tecnicamente teria acesso ao servidor, como em praticamente todo SaaS.
- Além dos mecanismos do Railway, existe um dump diário de recuperação. Ele é criptografado com `age` antes de sair do job, o arquivo sem criptografia é destruído e apenas o arquivo cifrado fica retido no GitHub por até 30 dias. A chave privada de recuperação não fica no repositório nem no GitHub Actions.
- Logs de entrega do WhatsApp guardam apenas metadados necessários para diagnóstico, com nome, telefone e erro criptografados. Esses registros são eliminados automaticamente após sete dias.
- A adequação à LGPD é um processo contínuo: os controles técnicos descritos aqui existem e são testados, mas **este documento não é um parecer jurídico**.

## Exceção de dependência registrada

- Em 27/07/2026, o React Router 7.18.1 possui o alerta
  [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2), aplicável somente às APIs
  instáveis de React Server Components (RSC). O UseCognia é uma SPA declarativa e não usa essas APIs.
- O CI aceita exclusivamente esse alerta enquanto ele não for aplicável. Qualquer outro aviso de
  produção ou a introdução de uma API de RSC volta a bloquear a compilação automaticamente.

## Contato para privacidade e incidentes

Solicitações de titulares de dados, dúvidas de privacidade ou relato de vulnerabilidade:
**usecognia@gmail.com** (assunto: "Privacidade" ou "Segurança").

---

*Última revisão técnica: julho de 2026 (inclui contatos de pacientes cifrados, preenchimento rápido sem dados pessoais no localStorage, retenção técnica automática e exclusão coordenada de arquivos).*
