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

Para dar suporte, a operação da plataforma pode usar um modo "ver como" (impersonação) — sempre registrado na trilha de auditoria. Esse modo **não alcança conteúdo clínico**: prontuários, sessões, anexos, documentos e respostas de instrumentos ficam bloqueados durante a impersonação. Ficam visíveis apenas informações operacionais (como status da conta e do plano), o suficiente para o suporte sem expor o sigilo clínico. Ações sensíveis (troca de senha, exclusão de conta e dados de cobrança) também são bloqueadas nesse modo. Esse bloqueio é coberto por testes automatizados.

## Dados clínicos

- Prontuários, anotações privadas de sessão e anexos são **criptografados no banco de dados** (AES-256-GCM, em nível de aplicação) — um acesso direto ao banco não expõe o conteúdo clínico em texto legível.
- Logs do sistema não registram conteúdo clínico.
- Ações sensíveis (visualização de paciente, exportação de prontuário, download de anexos, login) ficam registradas em **trilha de auditoria**.

## Documentos e links públicos

- Documentos em PDF têm código único e QR de verificação pública de autenticidade.
- Links públicos (agendamento, portal do paciente, instrumentos) usam tokens aleatórios longos, armazenados de forma irreversível (hash) e com limite de tentativas por IP.

## Proteções do site público

- A Vercel envia HSTS, `X-Content-Type-Options`, proteção contra incorporação em iframe, política de referência e restrições de permissões do navegador.
- O uso do microfone fica disponível apenas para a própria origem, quando o profissional inicia voluntariamente uma gravação.
- O canal padronizado de divulgação responsável fica publicado em `/.well-known/security.txt`.
- A Política de Privacidade pública descreve papéis, finalidades, fornecedores, direitos, retenção e limitações atuais.

## Copiloto de Raciocínio Clínico Neuropsicológico (plano Pro)

**Finalidade**: apoiar o psicólogo a organizar o raciocínio em avaliações neuropsicológicas — apontar convergências, divergências, funções possivelmente preservadas ou frágeis, hipóteses alternativas e lacunas de informação. **Não é uma ferramenta de diagnóstico** e não corrige testes psicológicos ou neuropsicológicos: não recebe nem processa itens, estímulos, manuais ou tabelas normativas de nenhum instrumento protegido.

**Dados processados**: somente os campos que o profissional escolher incluir na análise (motivo de encaminhamento, história clínica, hipóteses provisórias, observações qualitativas e/ou os registros da bateria de avaliação). Antes do envio, o backend remove identificadores diretos — nome, CPF, telefone, e-mail e endereço nunca chegam ao provedor de IA.

**Limites clínicos**: a resposta é sempre uma sugestão estruturada, com linguagem cautelosa, sem diagnóstico definitivo e sem recomendação de conduta como ordem. Cada afirmação relevante indica se é um dado registrado, uma inferência cautelosa ou uma lacuna de informação, e a que campo ou procedimento se refere. Toda resposta inclui um aviso de que foi gerada por IA e precisa ser revisada pelo profissional antes de qualquer uso.

**Responsabilidade profissional**: a sugestão da IA nunca é aplicada automaticamente à conclusão ou ao relatório final — o profissional decide, campo a campo, o que aproveitar, sempre com confirmação explícita antes de qualquer inclusão no rascunho de integração.

**Uso de provedor externo**: as chamadas usam a API da Anthropic (modelo Claude Haiku), sempre feitas pelo backend — a chave de API nunca é exposta ao navegador. A chamada só ocorre depois de o backend validar, no servidor, que a avaliação pertence ao psicólogo autenticado e que a conta está no plano Pro.

**Retenção**: o texto enviado ao provedor (prompt) não é armazenado. Apenas a resposta estruturada da IA é persistida, e sempre **criptografada** (AES-256-GCM) — junto de metadados não sensíveis (modelo, versão do prompt, tokens consumidos e custo estimado). Os campos que compuseram cada análise ficam registrados apenas pelo nome do campo (ex.: "história clínica"), nunca pelo conteúdo.

**Exclusão**: cada análise pode ser excluída individualmente pelo profissional a qualquer momento, permanentemente.

**Controle de custos**: o plano Pro tem uma franquia mensal de análises (configurável por variável de ambiente, hoje 30/mês). Cada geração ou regeneração consome uma unidade da franquia; uma falha do provedor antes de retornar uma análise válida não consome a franquia. O uso mensal (tokens de entrada/saída, modelo e custo estimado) fica registrado para acompanhamento.

**Como desativar**: para desativar o recurso por completo, defina `NEUROPSYCH_AI_MONTHLY_LIMIT=0` nas variáveis de ambiente do backend — nenhuma conta, independentemente do plano, conseguirá gerar novas análises. O organizador local de rascunho (sem IA) continua disponível normalmente.

## Seus direitos sobre os dados (LGPD)

- **Exportação**: você pode baixar todos os seus dados em PDF pela própria plataforma (`Configurações → Exportar dados`).
- **Exclusão**: a exclusão de conta remove os dados da plataforma. **Atenção**: o Conselho Federal de Psicologia exige guarda de prontuários por prazo mínimo — antes de excluir a conta, exporte seus prontuários e mantenha-os sob sua guarda profissional.
- **Consentimento**: o aceite dos Termos de Uso e da Política de Privacidade é registrado com versão e data.

## Limitações conhecidas (transparência)

- **Não há criptografia de ponta a ponta**: a criptografia é em trânsito (TLS) e em repouso (campo clínico criptografado no banco). A equipe de infraestrutura tecnicamente teria acesso ao servidor, como em praticamente todo SaaS.
- **Backups** são os do provedor (Railway). A política de frequência e retenção de backup deve ser conferida no painel do provedor.
- A adequação à LGPD é um processo contínuo: os controles técnicos descritos aqui existem e são testados, mas **este documento não é um parecer jurídico**.

## Contato para privacidade e incidentes

Solicitações de titulares de dados, dúvidas de privacidade ou relato de vulnerabilidade:
**usecognia@gmail.com** (assunto: "Privacidade" ou "Segurança").

---

*Última revisão técnica: julho de 2026 (inclui bloqueio de conteúdo clínico no acesso administrativo).*
