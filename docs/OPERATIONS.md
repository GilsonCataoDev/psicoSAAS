# Operacao do UseCognia

Checklist pratico para manter o ambiente de producao seguro e recuperavel.

## Healthcheck automatizado

`GET /health` (sem autenticacao) checa conectividade real com o banco e retorna sempre HTTP 200 — `status: "ok"` ou `"degraded"` (nunca 503, ver ADR-010 em `decisions.md`). E o endpoint usado pelo `healthcheckPath` do Railway (`backend/railway.json`).

```bash
curl https://psicosaas-production-2d6c.up.railway.app/api/health
```

Heartbeats opcionais (Better Stack) podem ser configurados por job critico via `BETTERSTACK_HEARTBEAT_REMINDER_URL` e `BETTERSTACK_HEARTBEAT_PAYMENT_URL` — sem essas vars, nada muda no comportamento (ver ADR-011).

## Monitoramento minimo

Verificar diariamente no painel Admin:

- Banco: deve aparecer como `OK`.
- Resend: deve estar configurado e com baixa taxa de falha.
- Asaas: deve aparecer com webhook protegido.
- WhatsApp: deve estar configurado quando lembretes por WhatsApp estiverem ativos.
- Push: deve estar configurado quando notificacoes push estiverem ativas.

Alertas que exigem acao:

- Falha de e-mail acima de 10% nos ultimos 7 dias.
- Contas `past_due` aumentando sem webhook recente do Asaas.
- Banco com falha ou latencia muito alta.
- Resend retornando `429` com frequencia.

## Backup do banco

Frequencia recomendada:

- Diario enquanto houver poucos clientes.
- A cada 6 horas quando o volume de usuarios aumentar.
- Antes de migrations, ajustes de billing ou limpeza manual de dados.

Comando local usando Railway:

```powershell
railway connect Postgres --environment production
```

Se for exportar com `pg_dump`, use a URL publica do Postgres no Railway e salve fora do repositorio:

```powershell
pg_dump "$env:DATABASE_PUBLIC_URL" --format=custom --file="usecognia-backup-YYYY-MM-DD.dump"
```

Nunca commitar arquivos `.dump`, `.sql`, `.backup` ou exports com dados reais.

## Deploy com migrations

Quando o backend tiver migration nova:

1. Fazer backup do banco antes do deploy, principalmente em migrations de dados.
2. Confirmar que o build do backend passa localmente.
3. Fazer push para `main` e aguardar o deploy do Railway.
4. Rodar no ambiente do backend:

```bash
npm run migration:show
npm run migration:run
```

5. Conferir logs do Railway e testar login, agenda, link publico e financeiro.

Migration mais recente:

- `AddPatientAttachmentStorageKey1782900000000`: adiciona `storageKey` em `patient_attachments` e torna `data` nullable, pra suportar o driver R2 opcional sem afetar anexos existentes (ver ADR-012 em `decisions.md`).

**Nota — bootstrap local em banco vazio:** a cadeia de migrations assume que a tabela `users` ja existe antes de `CreateRefreshTokensTable1714500000000` rodar; num Postgres completamente vazio (sem `synchronize` nem `init.sql` legado), `npm run migration:run` falha com `relation "users" does not exist`. Em desenvolvimento local, a forma mais simples de bootstrap e rodar a API com `TYPEORM_SYNC=true` fora de producao para o TypeORM criar o schema a partir das entidades, depois usar migrations nos ambientes que ja tem o banco de producao/staging existente. Nunca habilitar `TYPEORM_SYNC=true` em producao. `database/init.sql` esta desatualizado (schema legado em snake_case) — nao usar pra bootstrap novo.

## Teste de restauracao

Um backup so e confiavel quando ja foi restaurado pelo menos uma vez.

Fluxo recomendado:

1. Criar um banco temporario.
2. Restaurar o dump nesse banco.
3. Rodar a API apontando para o banco temporario.
4. Validar login, listagem de pacientes, agenda e prontuario.
5. Apagar o banco temporario depois do teste.

Comando de restauracao:

```powershell
pg_restore --clean --if-exists --dbname="$env:DATABASE_PUBLIC_URL" "usecognia-backup-YYYY-MM-DD.dump"
```

Usar esse comando apenas em banco temporario ou em restauracao planejada.

## Antes de divulgar forte

- Fazer um teste real controlado de assinatura no Asaas.
- Confirmar e-mail de verificacao chegando em Gmail e Outlook.
- Confirmar lembrete de sessao por e-mail e WhatsApp.
- Testar link publico de agendamento no celular.
- Exportar um prontuario PDF de teste.
- Conferir se termos, privacidade e LGPD estao publicados.

