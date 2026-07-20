# Especificação técnica inicial — Avaliação Neuropsicológica

Status: proposta inicial para validação, sem implementação
Produto: UseCognia
Data: 20/07/2026

## 1. Recomendação executiva

O módulo deve ser criado como um processo clínico próprio ligado ao paciente, e não como novos campos dentro do JSON de prontuário. Um paciente continua sendo uma única pessoa, mas pode ter psicoterapia, uma ou mais avaliações neuropsicológicas históricas e mudar seu modo principal de atendimento sem perder dados.

O menor desenho sustentável é:

1. adicionar ao paciente um `careMode` para organizar a interface;
2. criar as entidades `NeuropsychAssessment` e `NeuropsychBatteryItem`;
3. reaproveitar o armazenamento criptografado de anexos, acrescentando categoria e vínculo opcional com a avaliação;
4. reaproveitar a infraestrutura de IA, auditoria, autenticação e controle de uso já existente;
5. criar uma lista de avaliações e uma única tela de trabalho por avaliação;
6. incluir os novos dados na exportação LGPD e nos testes de isolamento entre profissionais.

Guardar toda a avaliação em `Patient.prontuario` exigiria menos linhas inicialmente, mas dificultaria avaliações repetidas, estados por teste, anexos, auditoria, exportação, concorrência e futuras evoluções. Por isso, essa alternativa não é recomendada.

## 2. Leitura da estrutura atual

### O que já pode ser reaproveitado

- `Patient` já é isolado por `psychologistId`, possui campos clínicos criptografados e é o agregado correto para a identidade da pessoa.
- `PatientAttachment` já recebe PDF, JPG e PNG, valida tipo e assinatura do arquivo, limita tamanho, criptografa o conteúdo e audita envio, download e exclusão.
- `InstrumentAssignment` já possui fluxo de escalas permitidas e resposta por link. Ele pode ser referenciado quando aplicável, mas não deve virar catálogo de testes neuropsicológicos protegidos.
- `Document` já atende documentos gerados e assinados. No MVP, o relatório final pode ser um anexo classificado; futuramente poderá também apontar para um documento assinado.
- A IA das sessões já possui adaptadores de provedores, limitação por plano, rate limit, contagem de uso e mensagens de cautela.
- Os controladores clínicos já usam autenticação, proteção CSRF, bloqueio de impersonação e filtros por profissional.
- Há auditoria e testes automatizados de isolamento entre locatários A/B.

### Lacunas encontradas

- O paciente não possui modalidade de atendimento.
- Não existe episódio de avaliação com começo, progresso e conclusão próprios.
- Anexos não têm categoria clínica nem vínculo com uma avaliação.
- A IA está acoplada ao módulo de sessões; a infraestrutura comum precisa de uma pequena extração antes de ser usada na avaliação.
- A exportação de dados atual não inclui anexos de paciente nem atribuições de instrumentos. Ao criar o módulo, a exportação deve passar a cobrir avaliações, itens da bateria e seus anexos.
- A lista e a ficha do paciente não diferenciam psicoterapia de avaliação neuropsicológica.

## 3. Modelo de domínio e dados

### 3.1 Patient — alteração pequena

Adicionar:

| Campo | Tipo | Regra |
|---|---|---|
| `careMode` | enum | `psychotherapy` ou `neuropsychological_assessment`; padrão `psychotherapy` |

`careMode` organiza a experiência atual, mas não é uma exclusão definitiva. Mudar o modo nunca apaga sessões, prontuários ou avaliações anteriores.

### 3.2 NeuropsychAssessment — nova entidade

Representa um episódio de avaliação.

| Campo | Tipo | Proteção/regra |
|---|---|---|
| `id` | UUID | chave primária |
| `psychologistId` | UUID | obrigatório; chave de isolamento |
| `patientId` | UUID | obrigatório; paciente do mesmo profissional |
| `status` | enum | `planning`, `in_progress`, `integration`, `completed`, `archived` |
| `referralQuestion` | texto | criptografado; motivo/pergunta de encaminhamento |
| `clinicalHistory` | texto | criptografado |
| `clinicalHypotheses` | texto | criptografado; hipóteses provisórias |
| `evaluatedDomains` | enum[]/JSONB | seleção entre os oito domínios definidos |
| `qualitativeObservations` | texto | criptografado |
| `integrationDraft` | texto | criptografado; sempre tratado como rascunho |
| `professionalConclusion` | texto | criptografado; preenchimento e responsabilidade do profissional |
| `startedAt` | data | obrigatória ao iniciar |
| `targetCompletionDate` | data | opcional |
| `completedAt` | data | preenchida ao concluir |
| `version` | inteiro | controle de edição concorrente |
| `createdAt`, `updatedAt` | timestamp | auditoria operacional |

Índices mínimos:

- `(psychologistId, status)` para a lista de avaliações;
- `(patientId, createdAt)` para o histórico do paciente;
- no MVP, no máximo uma avaliação ativa por paciente, usando índice parcial para estados não finalizados.

O banco pode permitir várias avaliações históricas, pois uma pessoa pode ser reavaliada no futuro.

### 3.3 NeuropsychBatteryItem — nova entidade

Representa um teste ou procedimento planejado/aplicado, sem armazenar seu conteúdo protegido.

| Campo | Tipo | Proteção/regra |
|---|---|---|
| `id` | UUID | chave primária |
| `assessmentId` | UUID | obrigatório |
| `psychologistId` | UUID | obrigatório; isolamento explícito |
| `patientId` | UUID | obrigatório; facilita validação e exportação |
| `name` | texto curto | nome informado pelo profissional |
| `procedureType` | enum | `psychological_test`, `neuropsychological_procedure`, `behavioral_scale`, `clinical_interview`, `observation`, `other` |
| `domains` | enum[]/JSONB | um ou mais domínios avaliados |
| `purpose` | texto | criptografado; finalidade clínica |
| `status` | enum | `planned`, `applied`, `integrated`, `not_applied` |
| `plannedDate` | data | opcional |
| `appliedDate` | data | exigida ao marcar como aplicado |
| `resultSummary` | texto | criptografado; resultado escrito pelo profissional |
| `qualitativeNotes` | texto | criptografado |
| `instrumentAssignmentId` | UUID | opcional; somente para instrumento permitido já existente |
| `sortOrder` | inteiro | ordem visual da bateria |
| `createdAt`, `updatedAt` | timestamp | rastreabilidade |

Nunca devem existir campos para itens, estímulos, folhas de resposta proprietárias, tabelas normativas, manuais, chaves ou algoritmos de correção de testes protegidos.

### 3.4 PatientAttachment — extensão da entidade existente

Adicionar:

| Campo | Tipo | Regra |
|---|---|---|
| `assessmentId` | UUID nulo | vínculo opcional com a avaliação do mesmo profissional/paciente |
| `kind` | enum | `test_result`, `final_report`, `supporting_document`, `other` |
| `batteryItemId` | UUID nulo | evolução opcional; pode ficar fora do primeiro release |

Se uma avaliação for arquivada, seus anexos permanecem. Exclusão definitiva precisa de confirmação, auditoria e política de retenção.

### 3.5 Domínios permitidos

- `intelligence`
- `attention`
- `memory`
- `executive_functions`
- `language`
- `visuospatial_skills`
- `behavioral_scales`
- `personality`

Os valores internos ficam estáveis e a interface apresenta os nomes em português.

## 4. Telas principais

### 4.1 Pacientes

- seletor “Modo de atendimento” ao cadastrar e editar;
- badge “Psicoterapia” ou “Avaliação neuropsicológica” na lista;
- filtro por modo;
- troca de modo com explicação de que o histórico será preservado.

### 4.2 Lista de avaliações — `/avaliacoes`

Uma área própria com:

- paciente;
- status;
- data de início;
- quantidade de itens aplicados/planejados;
- domínios selecionados;
- última atualização;
- busca e filtros por status;
- ação “Iniciar avaliação”.

No MVP, uma tabela responsiva é suficiente. Kanban e indicadores avançados ficam para depois.

### 4.3 Espaço de trabalho — `/avaliacoes/:id`

Uma única página com navegação por seções:

1. **Visão geral:** motivo, datas, status e domínios;
2. **História e hipóteses:** história clínica e hipóteses provisórias;
3. **Bateria:** planejamento, ordem e situação de cada item;
4. **Resultados:** resumo, observações e anexos por procedimento;
5. **Integração:** observações gerais, integração manual e apoio opcional de IA;
6. **Relatório final:** upload, visualização e conclusão da avaliação.

Mostrar salvamento, última atualização e alertas de campos pendentes. Ao concluir, a tela entra em modo de leitura, com ação explícita e auditada para reabrir.

### 4.4 Ficha do paciente

Adicionar uma aba “Avaliação” quando houver avaliação ou quando o modo atual for neuropsicológico. A aba mostra resumo e leva ao espaço de trabalho, sem duplicar todo o formulário dentro da ficha.

## 5. Fluxo do usuário

1. O profissional cadastra ou edita o paciente e escolhe “Avaliação Neuropsicológica”.
2. Seleciona “Iniciar avaliação”; o sistema impede uma segunda avaliação ativa para o mesmo paciente no MVP.
3. Registra motivo, história, hipóteses iniciais, datas e domínios.
4. Monta a bateria digitando apenas o nome e a finalidade dos procedimentos.
5. Conforme aplica, atualiza o status, registra resultados produzidos por ele e anexa os arquivos permitidos.
6. Escreve observações qualitativas e começa a integração.
7. Opcionalmente escolhe quais informações podem ser enviadas para o apoio de IA e solicita um rascunho organizacional.
8. Revisa, altera ou descarta o rascunho; nenhuma saída é aceita automaticamente.
9. Anexa o relatório final e confirma a conclusão.
10. O sistema registra a ação e preserva o processo como histórico. Reabertura exige confirmação e gera auditoria.

Casos importantes:

- mudar o paciente para psicoterapia não remove a avaliação;
- um paciente pode ter avaliações concluídas anteriores;
- um item não aplicado permanece com justificativa opcional;
- excluir um arquivo ou reabrir uma avaliação concluída é sempre auditado;
- anexar arquivo de outro paciente/locatário deve falhar sem revelar sua existência.

## 6. Permissões, privacidade e segurança

### Autorização e isolamento

- exigir autenticação, CSRF e bloqueio de impersonação em todas as mutações clínicas;
- toda consulta, alteração e exclusão deve filtrar simultaneamente por `id` e `psychologistId`;
- validar que paciente, avaliação, item, instrumento e anexo pertencem ao mesmo profissional antes de vinculá-los;
- não confiar em `psychologistId` recebido do frontend;
- criar testes A/B para leitura, edição, exclusão, anexos e execução da IA.

### Proteção dos dados

- criptografar no nível da aplicação os textos clínicos e o conteúdo dos anexos com o mecanismo AES-256-GCM atual;
- usar HTTPS em trânsito e manter chaves somente no ambiente seguro do backend;
- nunca registrar história, resultado, hipótese, nome de arquivo sensível ou saída clínica em logs técnicos;
- respostas de erro não devem confirmar a existência de dados de outro profissional;
- manter cache `private, no-store` para conteúdo clínico e downloads;
- validar MIME, assinatura real, tamanho e quantidade de arquivos;
- incluir avaliações, itens e anexos na exportação e exclusão de dados;
- definir retenção, backup, restauração e descarte seguro antes do lançamento em produção.

Dados de saúde são dados pessoais sensíveis. O módulo deve aplicar finalidade, necessidade, segurança, prevenção e prestação de contas, além de registrar base legal e informações de transparência adequadas ao produto.

### Auditoria mínima

Registrar sem copiar o conteúdo clínico:

- criação, conclusão, reabertura e arquivamento da avaliação;
- criação/alteração/exclusão de item;
- envio, download e exclusão de anexo;
- solicitação e aceitação explícita de rascunho de IA;
- exportação e exclusão dos dados.

## 7. Apoio de IA com segurança

### Ações permitidas

- organizar informações pelos domínios selecionados;
- sugerir uma estrutura de integração;
- resumir somente o material fornecido;
- destacar convergências, divergências e informações ausentes;
- formular pontos de atenção em linguagem cautelosa;
- sugerir perguntas para revisão do profissional.

### Ações proibidas

- corrigir, pontuar ou interpretar automaticamente testes protegidos;
- reproduzir itens, estímulos, tabelas normativas, manuais ou chaves;
- inferir escores não informados pelo profissional;
- produzir diagnóstico definitivo ou alegar certeza clínica;
- assinar, concluir ou anexar automaticamente o relatório final;
- substituir o julgamento ou ocultar a necessidade de revisão profissional.

### Fluxo técnico recomendado

1. O frontend mostra uma seleção explícita das seções que serão usadas.
2. O backend remove nome, CPF, e-mail, telefone e outros identificadores diretos.
3. O backend monta uma instrução fixa e versionada; texto do usuário nunca substitui as regras de sistema.
4. No MVP, somente texto estruturado é enviado. PDFs e imagens não são processados pela IA.
5. A resposta deve conter: síntese por domínio, convergências/divergências, lacunas, pontos para revisão e limitações.
6. O resultado aparece como “Rascunho gerado com apoio de IA”, separado do texto oficial.
7. O profissional pode descartar, copiar trechos ou aceitar explicitamente; não há salvamento automático.
8. Registrar provedor/modelo, horário, usuário, volume e custo, mas não o conteúdo do prompt em logs de uso.

Controles adicionais:

- limite de tamanho, frequência e custo;
- temperatura baixa e saída estruturada validada pelo backend;
- instrução para não inventar informações e responder “dados insuficientes” quando necessário;
- referência às seções/itens de origem, sem fabricar citações;
- aviso antes do primeiro uso sobre processamento por terceiro;
- configuração do provedor compatível com retenção mínima e não treinamento, comprovada contratualmente antes de prometer isso aos clientes;
- botão sempre opcional: o fluxo clínico completo funciona sem IA.

### Separação técnica da IA

O adaptador atualmente dentro de `SessionsModule` deve virar um pequeno `ClinicalAiModule`, usado por sessões e avaliações. As regras e o prompt neuropsicológico permanecem dentro do novo módulo. Assim, a avaliação não depende do módulo de sessões e uma troca de provedor não espalha lógica pelo sistema.

## 8. MVP enxuto

### Incluir

- modo de atendimento no paciente;
- lista de avaliações;
- uma tela de trabalho por avaliação;
- história, hipóteses, oito domínios, observações e integração;
- planejamento e acompanhamento dos itens da bateria;
- resultado escrito e anexos já suportados pelo sistema;
- classificação do anexo como resultado, apoio ou relatório final;
- uma ação limitada de IA para rascunho de integração;
- conclusão e reabertura auditadas;
- criptografia, isolamento A/B, migração e exportação LGPD;
- layout responsivo e dark mode legível.

### Não incluir no primeiro lançamento

- catálogo ou conteúdo de testes protegidos;
- correção automática, normas, percentis ou algoritmos de pontuação;
- leitura de PDF/OCR por IA;
- diagnóstico automático;
- modelos de relatório por teste proprietário;
- colaboração multiusuário e permissões de equipe;
- assinatura eletrônica nova;
- sincronização automática com SATEPSI;
- dashboards e comparações populacionais.

O núcleo sem IA deve ser entregue primeiro e testado. A ação de IA entra no mesmo MVP apenas depois das proteções e do fluxo manual estarem estáveis.

## 9. Menor conjunto de mudanças no projeto

### Backend

1. Criar `modules/neuropsych-assessments` com duas entidades, DTOs, serviço, controlador, módulo e testes.
2. Adicionar o módulo no `AppModule`.
3. Adicionar `careMode` à entidade/DTOs/serviço de pacientes e à projeção explícita da lista.
4. Acrescentar `assessmentId` e `kind` a `PatientAttachment`; manter o serviço de arquivos atual.
5. Extrair o adaptador de IA para `ClinicalAiModule`; manter prompts e políticas da avaliação no novo serviço.
6. Incluir avaliações, itens e anexos na exportação de dados.
7. Criar migração reversível para coluna, tabelas, índices e chaves estrangeiras; produção não usa sincronização automática.
8. Ampliar testes de isolamento e auditoria.

### Frontend

1. Atualizar tipos e cliente de API.
2. Adicionar o modo nos formulários de criar/editar paciente, badge e filtro na lista.
3. Criar `NeuropsychAssessmentsPage` e `NeuropsychAssessmentPage`.
4. Adicionar rota e item “Avaliações” na navegação.
5. Adicionar a aba/resumo condicional na ficha do paciente.
6. Reutilizar componentes de formulário, upload, feedback, confirmação e estados vazios existentes.

### O que não precisa mudar no MVP

- regras de agenda e agendamento público;
- sessões de psicoterapia;
- financeiro e pacotes;
- documentos já assinados;
- fluxo público de instrumentos existentes.

## 10. Critérios de aceite

### Funcionais

- profissional cria paciente nos dois modos e pode trocar o modo sem perder histórico;
- inicia, edita, conclui, reabre e consulta uma avaliação;
- planeja e ordena itens, marca aplicação e registra resultados;
- anexa e baixa resultados e relatório final;
- filtra avaliações e acompanha progresso;
- usa ou ignora a IA sem bloquear o fluxo;
- exportação do paciente contém todos os novos registros e arquivos aplicáveis.

### Segurança

- profissional A não lê, altera, vincula ou apaga dados do profissional B, mesmo conhecendo os UUIDs;
- tentativas cruzadas retornam resposta neutra e geram o evento de segurança adequado;
- textos clínicos e arquivos não aparecem em claro no banco nem em logs;
- anexos inválidos são recusados por conteúdo, não apenas pela extensão;
- nenhuma rota clínica funciona sem os guards definidos;
- IA não recebe identificadores diretos nem arquivos no MVP;
- saída da IA nunca é salva, concluída ou assinada sem ação explícita.

### Qualidade e regressão

- migração sobe e reverte em ambiente de teste;
- lint, build, testes backend/frontend e auditoria de dependências passam;
- testes cobrem transições de status e uma única avaliação ativa;
- pacientes de psicoterapia continuam com o fluxo atual inalterado;
- telas funcionam em desktop/mobile e temas claro/escuro.

## 11. Evoluções posteriores

1. modelos configuráveis de roteiro e bateria, sem incorporar material protegido;
2. vínculo opcional com instrumentos públicos ou licenciados, respeitando permissão de uso;
3. geração assistida de documento dentro do módulo de documentos, sempre revisada e assinada pelo profissional;
4. colaboração com papéis específicos para clínica/equipe e trilha de alterações;
5. linha do tempo e indicadores operacionais de prazo, sem transformar dados clínicos em ranking;
6. comparação longitudinal entre avaliações do mesmo paciente, com contexto e cautela;
7. extração de documentos somente após avaliação jurídica, técnica e contratual do provedor;
8. consentimento e preferências de IA mais granulares;
9. catálogo administrativo apenas de nomes/metadados autorizados, com verificação periódica do status do instrumento;
10. integrações com encaminhamentos e devolutivas.

## 12. Referências normativas para validação jurídica/profissional

- [Lei Geral de Proteção de Dados Pessoais — Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm).
- [Resolução CFP nº 31/2022 e legislação do SATEPSI](https://satepsi.cfp.org.br/legislacao.cfm), além das [orientações oficiais do sistema](https://satepsi.cfp.org.br/).
- [Resolução CFP nº 06/2019 comentada, sobre elaboração de documentos escritos](https://site.cfp.org.br/wp-content/uploads/2019/09/Resolu%C3%A7%C3%A3o-CFP-n-06-2019-comentada.pdf).
- [Posicionamento do CFP sobre inteligência artificial no contexto da prática psicológica](https://site.cfp.org.br/cfp-divulga-posicionamento-sobre-inteligencia-artificial-no-contexto-da-pratica-psicologica/).

Esta especificação é técnica e não substitui validação jurídica, contratual nem revisão por profissional habilitado antes do lançamento.
