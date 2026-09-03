# Jobs de prospecção como Railway Cron Service

## Por quê

Os jobs de prospecção (`backend/src/modules/prospecting/jobs/*.job.ts`) rodavam
com `setInterval` dentro do processo sempre-ativo da API. O job mais pesado
(`analyze`, a cada 30min) faz crawling de sites — picos de memória que o
Node/V8 não devolve totalmente ao sistema depois, inflando o uso de memória
do container pelo resto do período de cobrança da Railway (que fatura por
GB-minuto).

Solução: extrair cada job pra um processo que **sobe, executa uma vez, sai**
— `backend/src/cron-prospecting.ts` (compilado em `dist/cron-prospecting.js`).
Um Railway Cron Service só é cobrado pelo tempo real de execução, não 24/7.

## O que já está pronto no código

- `backend/src/cron-prospecting.ts`: aceita o nome do job como argumento
  (`discover`, `analyze`, `metrics`, `expire`, `retry`, `followups`), sobe um
  `NestApplicationContext` (sem HTTP), executa `job.run()` e fecha.
- Os 5 arquivos de job em `backend/src/modules/prospecting/jobs/` agora
  respeitam uma nova variável: se `PROSPECTING_CRON_EXTERNAL=true`, eles **não**
  se auto-agendam com `setInterval` (esperam ser chamados externamente).
  Enquanto essa variável não existir/for `false`, o comportamento atual
  (in-process) continua exatamente igual — nada muda até você ativar.

## Passo a passo (fazer no painel da Railway)

Repita para cada um dos 6 jobs, criando **um novo serviço** por job no mesmo
projeto (aba "+ New" → "Empty Service" → conectar ao mesmo repo/branch):

| Job | Comando de start | Cron schedule sugerido |
|---|---|---|
| `discover` | `node dist/cron-prospecting.js discover` | `0 * * * *` (a cada hora) |
| `analyze` | `node dist/cron-prospecting.js analyze` | `*/30 * * * *` (a cada 30min) |
| `metrics` | `node dist/cron-prospecting.js metrics` | `0 * * * *` (a cada hora) |
| `expire` | `node dist/cron-prospecting.js expire` | `0 3 * * *` (1x/dia, 3h) |
| `retry` | `node dist/cron-prospecting.js retry` | `0 */6 * * *` (a cada 6h) |
| `followups` | `node dist/cron-prospecting.js followups` | `0 * * * *` (a cada hora, só roda de fato se `PROSPECTING_OUTREACH_ENABLED=true`) |

Para cada serviço novo:

1. **Build**: mesma configuração do serviço principal (`backend/` como root,
   builder NIXPACKS, `npm install --legacy-peer-deps && npm run build`).
2. **Deploy → Custom Start Command**: o comando da tabela acima.
3. **Deploy → Cron Schedule**: ative e cole o schedule da tabela acima.
4. **Variables**: copie (ou referencie/compartilhe) as mesmas variáveis do
   serviço principal — precisa de `DATABASE_URL`, `ENCRYPTION_KEY`,
   `JWT_SECRET`, `SIGN_SECRET`, `PROSPECTING_*`, etc. (o `main.ts`/bootstrap
   valida essas obrigatórias mesmo em modo cron, então não pulam a checagem).
5. **Health check**: não configure — Cron Services não ficam com porta HTTP
   aberta, o healthcheck do `railway.json` é só do serviço web principal.

## Ativar de fato (depois que os 6 serviços estiverem criados e testados)

No serviço principal (`psicoSAAS`), adicione:

```
PROSPECTING_CRON_EXTERNAL=true
```

Isso desliga o `setInterval` in-process nos 5 arquivos de job — a partir daí,
só os novos Cron Services executam essas rotinas.

## Rollback

Se algo der errado, basta remover (ou não setar) `PROSPECTING_CRON_EXTERNAL`
no serviço principal — os jobs voltam a rodar in-process como antes, sem
precisar reverter código. Os Cron Services extras podem ficar pausados ou
serem removidos.

## Teste local (opcional, antes de criar os serviços)

Não dá para rodar `node dist/cron-prospecting.js <job>` localmente contra o
Postgres de produção via `railway run` — o hostname `postgres.railway.internal`
só resolve dentro da rede privada da Railway. O comando funciona normalmente
uma vez rodando como serviço na própria Railway.
