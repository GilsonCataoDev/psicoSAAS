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
