# Decisões de Arquitetura — UseCognia

Registro das decisões técnicas não-óbvias tomadas no projeto. O objetivo é evitar que a motivação se perca com o tempo.

---

## ADR-001 — JWT em cookie HttpOnly, não localStorage

**Decisão:** Access token armazenado em cookie HttpOnly com `SameSite=Strict`. Bearer header desabilitado no guard.

**Por quê:** Token em `localStorage` é acessível por qualquer JavaScript na página, incluindo scripts injetados (XSS). Cookie HttpOnly é invisível ao JS. O tradeoff é precisar de CSRF protection — resolvido com HMAC stateless (ver ADR-002).

**Consequência:** Todo cliente que consome a API precisa enviar o header `x-csrf-token` em rotas mutantes (POST/PATCH/DELETE).

---

## ADR-002 — CSRF stateless via HMAC, não sessão

**Decisão:** `csrfToken = HMAC-SHA256(JWT_SECRET, "csrf:" + userId)`. Retornado no body de `/auth/login` e `/auth/me`. Verificado com `timingSafeEqual`.

**Por quê:** Tokens de sessão CSRF requerem estado no servidor (Redis/DB). Com HMAC determinístico, o token pode ser verificado sem estado adicional, é específico por usuário e muda automaticamente quando o `JWT_SECRET` rotaciona.

**Consequência:** Qualquer leak do `JWT_SECRET` compromete tanto o JWT quanto o CSRF. Manter a variável segura é crítico.

---

## ADR-003 — Criptografia de notas clínicas na camada de aplicação

**Decisão:** `summary`, `privateNotes`, `nextSteps` (sessions) e `privateNotes`/`prontuario` (patients) são criptografados com AES-256-GCM antes de serem gravados no banco.

**Por quê:** Criptografia em nível de banco (Transparent Data Encryption) protege o arquivo físico mas não protege contra um atacante com acesso ao banco em runtime. Criptografia na aplicação garante que mesmo um dump do banco não expõe os dados clínicos sem a `ENCRYPTION_KEY`.

**Tradeoff:** Não é possível fazer `WHERE` ou `ORDER BY` em campos criptografados. Buscas em notas clínicas são client-side ou exigem descriptografar tudo.

---

## ADR-004 — IDOR guard via query, não fetch-then-check

**Decisão:** Endpoints de detalhe (ex: `GET /sessions/:id`) fazem `findOne({ where: { id, psychologistId } })` diretamente. Não fazem `findOne(id)` seguido de verificação do `psychologistId`.

**Por quê:** O padrão fetch-then-check tem uma janela de race condition onde a entidade pode ser lida antes da verificação. Mais importante: é fácil esquecer o check em refactors. Embutir a restrição na query garante que o banco rejeite o acesso por design — não há como vazar o dado acidentalmente.

**Onde se aplica:** `sessions.service.ts:findRaw`, `patients.service.ts:findOne`, e todos os métodos de detalhe nos módulos clínicos.

---

## ADR-005 — pg_advisory_lock com QueryRunner dedicado para background jobs

**Decisão:** `AdvisoryLockService.withLock()` usa `dataSource.createQueryRunner()` para criar uma conexão dedicada, faz o lock, executa o job e desbloqueia na mesma conexão antes de liberá-la.

**Por quê:** `pg_advisory_lock` é session-level — lock e unlock precisam acontecer na mesma conexão PostgreSQL. O pool de conexões do TypeORM não garante que queries consecutivas usem a mesma conexão. Usar um QueryRunner dedicado (checkout + connect) garante isso.

**Dupla proteção:** `this.running` (flag intra-processo, barato, sem DB) + `pg_advisory_lock` (cross-instância, necesssário em multi-replica). O flag evita que o advisory lock seja sequer tentado quando o mesmo processo já está rodando o job.

**Chaves usadas:**
| Job | Chave |
|-----|-------|
| AppointmentReminder | 1001 |
| PaymentReminder | 1002 |
| BillingTrialEmail | 1003 |
| BillingReconciliation | 1004 |
| ChurnScore | 1005 |
| WhatsappLogRetention | 1006 |
| ProspectingDiscover | 1007 |
| ProspectingAnalyze | 1008 |
| ProspectingExpire | 1009 |
| ProspectingRetry | 1010 |
| ProspectingMetrics | 1011 |

---

## ADR-006 — Barrel re-export em useApi.ts (15 domínios)

**Decisão:** `frontend/src/hooks/useApi.ts` é um arquivo de 15 linhas que apenas re-exporta os hooks de `./api/*.ts`. Os hooks vivem em arquivos separados por domínio.

**Por quê:** O arquivo original de 967 linhas tornava difícil localizar e modificar hooks. Dividir em domínios permite navegar, testar e rever cada área de forma independente. O barrel garante compatibilidade total com todos os imports existentes (`import { usePatients } from '@/hooks/useApi'` continua funcionando sem alteração).

**Como adicionar um novo hook:** criar ou editar o arquivo em `frontend/src/hooks/api/<dominio>.ts` e adicionar `export * from './api/<dominio>'` no barrel se for um novo arquivo.

---

## ADR-007 — Rotas literais antes de `:id` no NestJS

**Decisão:** Em todos os controllers, rotas com segmentos literais são declaradas antes de rotas com parâmetros (`:id`, `:slug`, etc.).

**Por quê:** NestJS resolve rotas na ordem de declaração. Se `GET /sessions/dashboard` for declarado depois de `GET /sessions/:id`, o NestJS trata `dashboard` como valor do parâmetro `:id` e a rota nunca é alcançada.

**Exemplo:**
```typescript
@Get('dashboard')   // literal — deve vir ANTES
getDashboard() {}

@Get(':id')         // parâmetro — deve vir DEPOIS
findOne() {}
```

---

## ADR-008 - Vinculos financeiros explicitos

**Decisao:** `financial_records` deve armazenar vinculos separados para `sessionId`, `appointmentId` e `bookingId`.

**Por que:** O campo `sessionId` estava sendo usado como referencia ambigua: as vezes apontava para uma sessao clinica real, as vezes para um appointment criado a partir do agendamento publico. Isso dificultava sincronizar pagamento, booking e sessao sem efeitos colaterais.

**Compatibilidade:** Registros antigos continuam sendo reconhecidos por fallback quando `sessionId` contem um `appointmentId`. A migration `NormalizeFinancialLinks1782600000000` faz backfill para preencher `appointmentId` e `bookingId` quando possivel.

**Consequencia:** Novos fluxos devem preencher o campo correto. Fluxos de booking publico gravam `bookingId` e `appointmentId`; fluxos de sessao clinica gravam `sessionId` e, se houver, `appointmentId`.

---

## ADR-009 — Lista de supressão de e-mail via webhook do Resend (rawBody global)

**Decisão:** `NestFactory.create(AppModule, { rawBody: true })` expõe `req.rawBody` em toda requisição. O webhook `POST /email/webhook` verifica a assinatura Svix sobre esses bytes crus e, em bounce permanente ou reclamação de spam, grava o endereço em `email_suppressions`. `EmailService.deliver()` consulta essa tabela antes de qualquer envio.

**Por quê:** Reenviar e-mail para um endereço que já deu bounce permanente ou marcou uma mensagem anterior como spam derruba a reputação do domínio inteiro no Resend e nos provedores (Gmail/Yahoo), não só a entrega individual — isso é o principal fator de e-mails legítimos caírem em spam. Sem um mecanismo de supressão, o sistema continuaria batendo nos mesmos endereços ruins indefinidamente.

**Por que `rawBody` global e não só na rota do webhook:** o body-parser do NestJS já teria reconstruído/reserializado o JSON antes do controller rodar, o que invalida a assinatura HMAC calculada pelo Resend sobre o payload original byte a byte. `rawBody: true` é a opção suportada nativamente pelo Nest para capturar os bytes crus sem precisar de um parser customizado por rota.

**Tradeoff:** só bounce do tipo `Permanent` suprime — bounce `Transient` (caixa cheia, servidor temporariamente fora) é esperado se resolver sozinho e não deveria bloquear envios futuros.

**Consequência:** sem `RESEND_WEBHOOK_SECRET` configurado, o endpoint rejeita todo payload (falha fechado) e a supressão simplesmente não acontece — não é um requisito para o app subir, mas sem ele bounces/reclamações nunca são registrados.

---

## ADR-010 — `/health` responde 200 mesmo com banco fora (`degraded`, não `503`)

**Decisão:** `GET /health` checa `SELECT 1` no banco e retorna `{ status: "ok"|"degraded", checks: { database } }`, sempre com HTTP 200 — nunca 503, mesmo quando o banco falha.

**Por quê:** Falhas de banco costumam ser transitórias (reconexão de pool, deploy do Postgres, hiccup de rede). Se o healthcheck do Railway recebesse 503 nesses momentos, o orquestrador poderia reiniciar o container ou marcar o deploy como falho por um problema que se resolveria sozinho em segundos. Retornar 200 com `status: "degraded"` deixa o problema visível (pra quem monitora o body) sem acionar restart automático.

**Segurança:** a resposta nunca inclui mensagem de erro real, stack trace, connection string ou nome de variável de ambiente — só `"ok"`/`"error"` por checagem.

---

## ADR-011 — Heartbeat de monitoramento é fail-open e nunca bloqueia o job

**Decisão:** `HeartbeatService.ping(envVar)` é fire-and-forget (`fetch(url).catch(() => {})`, sem `await` bloqueante no fluxo principal do job) e é um no-op completo se a env var da URL não estiver configurada.

**Por quê:** Um serviço de monitoramento externo (Better Stack) é auxiliar, não crítico. Se o heartbeat travasse ou lançasse exceção, um lembrete de sessão ou cobrança deixaria de ser enviado por causa de um problema no monitoramento — inversão de prioridade inaceitável. Sem nenhuma env var configurada, o comportamento do sistema é idêntico ao de antes dessa feature existir.

---

## ADR-012 — Anexos clínicos em R2 são opcionais, privados e sem migração automática

**Decisão:** `ATTACHMENTS_STORAGE_DRIVER=postgres|r2` (padrão `postgres`, comportamento inalterado). Quando `r2`, o objeto é sempre criptografado antes do upload, a key do bucket inclui `psychologistId` (isolamento reforçado na própria key, não só na query), nunca é gerada URL pública/CDN, e anexos já existentes no Postgres **não são migrados automaticamente** para R2.

**Por quê:** Um driver alternativo pra armazenamento de dados clínicos precisa ser estritamente aditivo — não pode arriscar dado clínico existente numa migração automática, nem exigir a configuração de credenciais de storage pra continuar funcionando. `StorageService` (já usado para avatar) foi reaproveitado em vez de criar um client S3 novo.

**Consequência:** trocar o driver não migra o histórico — anexos antigos continuam legíveis via Postgres indefinidamente; só uploads novos, após a troca, vão para R2.

---

## ADR-013 — Redação best-effort de PII antes de enviar erros ao Sentry

**Decisão:** `Sentry.init({ sendDefaultPii: false, beforeSend })` remove `request.cookies`/`Authorization` e varre `message`/`extra` por padrões de e-mail/telefone via regex, redigindo antes do envio.

**Por quê:** O ideal é nunca colocar PII em campos livres de erro (`extra`, `message`) — essa é a primeira linha de defesa e continua sendo responsabilidade de quem escreve o código. `beforeSend` é uma segunda camada: um erro futuro que acidentalmente inclua um e-mail ou telefone num payload de exceção não vaza pro Sentry sem essa rede de segurança. Não substitui a disciplina de não logar PII — é defesa em profundidade.

---

## ADR-014 — Telefone obrigatório só para novos cadastros, sem exigir de contas existentes

**Decisão:** `RegisterDto.phone` é obrigatório (10-11 dígitos). A coluna `phone` na tabela `users` continua `nullable` — nenhuma migração retroativa exige telefone de contas já cadastradas.

**Por quê:** Tornar a coluna `NOT NULL` quebraria login de qualquer conta existente sem telefone cadastrado. A exigência é uma regra de negócio no cadastro (usado pra lembretes via WhatsApp), não uma invariante de schema — separar as duas coisas evita uma migração de dados desnecessária e arriscada.
