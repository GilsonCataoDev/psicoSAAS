# UseCognia — Referência da API

Base URL produção: `https://psicosaas-production-2d6c.up.railway.app/api`

## Autenticação

- **Access token**: JWT em cookie HttpOnly `psicosaas_token` (15 min). Bearer header desabilitado.
- **Refresh token**: opaco, cookie HttpOnly, 7 dias, rotacionado a cada uso com detecção de replay.
- **CSRF**: header `x-csrf-token` obrigatório em rotas mutantes (POST/PATCH/DELETE). Token retornado no body de `/auth/login`, `/auth/register` e `/auth/me`.
- **Rate limit global**: 3 req/s + 100 req/min por IP. Login: 10 tentativas por e-mail / 15 min → 429.

Legenda de proteção: 🔓 pública · 🔑 JWT · 🔑✍ JWT + CSRF · 👑 JWT + CSRF + Admin

---

## Health — `/health`

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET | `/health` | 🔓 | Status do serviço + checagem real de conectividade com o banco (`checks.database: "ok"\|"error"`). Sempre 200 (mesmo `degraded`) para não disparar falso alarme de infra em falha transitória. Nunca expõe stack trace, connection string ou nomes de variável de ambiente. |

---

## Auth — `/auth`

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| POST | `/auth/register` | 🔓 | Cadastro (requer `termsAccepted` e `phone` — telefone obrigatório, 10-11 dígitos); envia e-mail de verificação |
| POST | `/auth/login` | 🔓 | Login; retorna user + csrfToken; cookies setados |
| POST | `/auth/refresh` | 🔓 (cookie) | Rotaciona refresh token |
| POST | `/auth/logout` | 🔑✍ | Revoga sessão |
| GET | `/auth/me` | 🔑 | Usuário atual + csrfToken (chamado no boot do app) |
| GET | `/auth/verify-email?token=` | 🔓 | Confirma e-mail (expira em 48h) |
| POST | `/auth/resend-verification` | 🔑✍ | Reenvia link de verificação |
| POST | `/auth/forgot-password` | 🔓 | Sempre 200 (anti user-enumeration) |
| POST | `/auth/reset-password` | 🔓 | Reset com token (2h); revoga todas as sessões |
| PATCH | `/auth/profile` | 🔑✍ | Atualiza perfil |
| PATCH | `/auth/password` | 🔑✍ | Troca senha logado |
| PATCH | `/auth/preferences` | 🔑✍ | Preferências (JSON) |
| PATCH | `/auth/onboarding` | 🔑✍ | Estado do onboarding |
| POST | `/auth/avatar` | 🔑✍ | Upload de avatar |
| DELETE | `/auth/account` | 🔑✍ | Exclui conta (requer senha) |

O campo `user.isAdmin` é derivado de `ADMIN_EMAILS` e retornado em login/me.

---

## Pacientes — `/patients`

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET | `/patients` | 🔑✍ | Lista (filtrado por psicólogo) |
| GET | `/patients/:id` | 🔑✍ | Detalhe com sessões e appointments (descriptografados) |
| GET | `/patients/:id/prontuario/export` | 🔑 throttle 5/h | PDF do prontuário completo (dados, anamnese, plano, sessões) |
| POST | `/patients` | 🔑✍ | Cria (valida limite do plano) |
| PATCH | `/patients/:id` | 🔑✍ | Atualiza (criptografa `privateNotes`/`prontuario`) |
| DELETE | `/patients/:id` | 🔑✍ | Soft delete |

Campos criptografados (AES-256-GCM): `privateNotes`, `prontuario` (JSON inteiro).

### Anexos — `/patients/:patientId/attachments`

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET | `/patients/:patientId/attachments` | 🔑✍ | Lista anexos (opcional `?assessmentId=` para filtrar por avaliação) |
| POST | `/patients/:patientId/attachments` | 🔑✍ | Upload (PDF/JPG/PNG, máx 10MB, valida assinatura binária real do arquivo, não só o mimetype declarado) |
| GET | `/patients/:patientId/attachments/:attachmentId/download` | 🔑✍ | Stream do arquivo descriptografado |
| DELETE | `/patients/:patientId/attachments/:attachmentId` | 🔑✍ | Remove |

Armazenamento: driver `postgres` (padrão, base64 criptografado no banco) ou `r2` (opcional, `ATTACHMENTS_STORAGE_DRIVER=r2`) — bucket privado no Cloudflare R2, conteúdo sempre criptografado antes do upload, nunca em URL/CDN pública. Isolamento por psicólogo reforçado na própria key do objeto no bucket. Ver `docs/cloudflare.md`.

## Portal do Paciente — `/patient-portal` 🔓

Acesso via token único gerado pelo psicólogo. Sem autenticação.

| Método | Rota | Throttle | Descrição |
|---|---|---|---|
| GET | `/patient-portal/:token` | 30/min | Dados da ficha de anamnese do paciente |
| PATCH | `/patient-portal/:token/intake` | 8/min | Paciente preenche/atualiza dados de anamnese |

---

## Sessões — `/sessions`

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET | `/sessions?patientId=` | 🔑✍ | Lista (opcionalmente por paciente) |
| GET | `/sessions/dashboard` | 🔑✍ | Stats do dashboard |
| GET | `/sessions/:id` | 🔑✍ | Detalhe (IDOR guard via query) |
| POST | `/sessions` | 🔑✍ | Cria |
| PATCH | `/sessions/:id` | 🔑✍ | Atualiza |
| DELETE | `/sessions/:id` | 🔑✍ | Remove |

Campos criptografados: `summary`, `privateNotes`, `nextSteps`.

---

## Agendamentos — `/appointments`

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET | `/appointments` | 🔑✍ | Lista |
| POST | `/appointments` | 🔑✍ | Cria (suporta recorrência via `recurringGroupId`) |
| GET | `/appointments/:id` | 🔑✍ | Detalhe |
| PATCH | `/appointments/:id` | 🔑✍ | Atualiza |
| DELETE | `/appointments/:id` | 🔑✍ | Remove |
| PATCH | `/appointments/:id/status` | 🔑✍ | Muda status |
| PATCH | `/appointments/group/:groupId/from/:fromDate` | 🔑✍ | Edita recorrência "deste em diante" |
| DELETE | `/appointments/group/:groupId/from/:fromDate` | 🔑✍ | Exclui recorrência "deste em diante" |

---

## Disponibilidade — `/availability`

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET | `/availability/slots` | 🔑✍ | Horários por dia da semana |
| POST | `/availability/slots` | 🔑✍ | Define horários |
| GET | `/availability/blocked` | 🔑✍ | Bloqueios pontuais |
| POST | `/availability/blocked` | 🔑✍ | Adiciona bloqueio |
| DELETE | `/availability/blocked/:id` | 🔑✍ | Remove bloqueio |

---

## Booking Interno — `/booking`

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET | `/booking` | 🔑✍ | Agendamentos recebidos pelo link publico |
| GET | `/booking/page` | 🔑✍ | Config da página pública (slug, ativo) |
| POST | `/booking/page` | 🔑✍ | Salva config |
| GET | `/booking/daily-link` | 🔑✍ | Link diário rotativo (token HMAC, muda à meia-noite) |
| PATCH | `/booking/:id/confirm` | 🔑✍ | Confirma; cria paciente + appointment + lançamento financeiro |
| PATCH | `/booking/:id/reject` | 🔑✍ | Rejeita |
| PATCH | `/booking/:id/pay` | 🔑✍ | Marca pago |
| POST | `/booking/sync-appointments` | 🔑✍ | Sincroniza com agenda interna |

## Booking Publico — `/public/booking` 🔓

| Método | Rota | Descrição |
|---|---|---|
| GET | `/public/booking/:slug` | Perfil publico (nome, especialidade, avatar, WhatsApp) |
| GET | `/public/booking/:slug/dates` | Datas disponiveis no mes |
| GET | `/public/booking/:slug/slots` | Horarios disponiveis numa data |
| POST | `/public/booking/:slug` | Confirma agendamento automaticamente; cria paciente, appointment e financeiro pendente |
| GET | `/public/booking/confirm/:token` | Compatibilidade: retorna agendamento ja confirmado quando aplicavel |
| GET | `/public/booking/cancel/:token` | Paciente cancela pelo link |

---

## Financeiro — `/financial`

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET | `/financial` | 🔑✍ | Lista lançamentos |
| GET | `/financial/summary` | 🔑✍ | Resumo mensal |
| POST | `/financial` | 🔑✍ | Cria lançamento |
| PATCH | `/financial/:id/pay` | 🔑✍ | Marca pago |
| POST | `/financial/:id/send-charge` | 🔑✍ | Link de pagamento Asaas (cartão/PIX/boleto) |
| DELETE | `/financial/:id` | 🔑✍ | Remove |

---

## Documentos — `/documents`

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| POST | `/documents` | 🔑✍ + plano Essencial | Cria e assina (HMAC-SHA256) |
| GET | `/documents` | 🔑 | Lista |
| GET | `/documents/:id/pdf` | 🔑 | PDF com QR code de verificação |
| POST | `/documents/:id/send-email` | 🔑✍ | Envia por e-mail (Resend, anexo base64) |
| GET | `/documents/verify/:code` | 🔓 | Verificação pública de autenticidade |
| DELETE | `/documents/:id` | 🔑✍ | Exclui |

Tipos: `declaracao`, `recibo`, `relatorio`, `atestado`, `encaminhamento`. Conteúdo criptografado em repouso.

---

## Billing — `/billing`

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET | `/billing/me` | 🔑 | Subscription atual ou `{status:"none"}` (normaliza trial expirado) |
| POST | `/billing/tokenize` | 🔑✍ | Tokeniza cartão no Asaas (PAN/CVV nunca persistidos) |
| POST | `/billing/subscribe` | 🔑✍ | Trial 7 dias com cartão obrigatório (`hasUsedTrial` impede repetição) |
| POST | `/billing/free` | 🔑✍ | Ativa plano free |
| POST | `/billing/change-plan` | 🔑✍ | Upgrade/downgrade |
| POST | `/billing/update-card` | 🔑✍ | Novo cartão + retry quando `past_due` |
| POST | `/billing/cancel` | 🔑✍ | `cancelAtPeriodEnd = true` |
| POST | `/billing/webhook` | 🔓 | Webhook Asaas (idempotente, valida token via `ASAAS_WEBHOOK_TOKEN`) |
| GET | `/billing/metrics` | 👑 | Contagens por status + MRR |

### Máquina de estados da subscription

```
[none] ──subscribe──→ [trialing] ──PAYMENT_RECEIVED──→ [active]
                           │                                │
                           └──trial expirado sem pg──→ [past_due] ──update-card──→ [active]
                                                           │
                                                    SUBSCRIPTION_CANCELLED
                                                           │
                                                        [canceled]
```

Estados extras: `pending` (tokenização em andamento), `free` (plano gratuito/Beta).
Planos: `free` · `essencial` (R$ 79/mês) · `pro` (R$ 149/mês).

---

## Notificações WhatsApp — `/notifications/whatsapp` 🔑 (plano Pro)

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET | `/notifications/whatsapp/status` | 🔑 | Status da conexão (connected/disconnected/qr_pending) |
| GET | `/notifications/whatsapp/logs` | 🔑 | Histórico de envios |
| POST | `/notifications/whatsapp/connect` | 🔑✍ | Inicia conexão; retorna QR code |
| POST | `/notifications/whatsapp/reset` | 🔑✍ | Desconecta e reinicia |
| POST | `/notifications/whatsapp/test` | 🔑✍ | Envia mensagem de teste (body: `{ phone? }`) |
| GET | `/notifications/whatsapp/debug` | 👑 | Debug da instância (admin only) |

## Notificações Push — `/notifications/push` 🔑

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET | `/notifications/push/status` | 🔑 | Assinaturas push ativas do usuário |
| POST | `/notifications/push/subscribe` | 🔑✍ | Registra dispositivo (body: PushSubscription Web API) |
| DELETE | `/notifications/push/unsubscribe` | 🔑✍ | Remove dispositivo (body: `{ endpoint }`) |
| POST | `/notifications/push/test` | 🔑✍ | Envia push de teste para o usuário |

---

## Instrumentos — `/instrument-assignments`

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET | `/instrument-assignments` | 🔑✍ | Lista atribuições do psicólogo |
| POST | `/instrument-assignments` | 🔑✍ | Atribui instrumento a paciente |
| PATCH | `/instrument-assignments/:id/answers` | 🔑✍ | Salva respostas |
| GET | `/public/instruments/:token` | 🔓 | Paciente abre o formulário |
| POST | `/public/instruments/:token` | 🔓 | Paciente envia respostas |

Biblioteca: 16 formulários clínicos + 13 escalas validadas (PHQ-9, GAD-7, DASS-21, PCL-5, SRQ-20, AUDIT, ISI, ESS, MEEM, WHODAS 2.0, SDQ, GAF, IES-R, C-SSRS, ASRS-v1.1).

---

## Avaliação Neuropsicológica — `/neuropsych-assessments`

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET | `/neuropsych-assessments` | 🔑✍ | Lista avaliações do psicólogo |
| GET | `/neuropsych-assessments/:id` | 🔑✍ | Detalhe |
| POST | `/neuropsych-assessments` | 🔑✍ | Cria avaliação |
| PATCH | `/neuropsych-assessments/:id` | 🔑✍ | Atualiza |
| POST | `/neuropsych-assessments/:id/battery-items` | 🔑✍ | Adiciona item de bateria de testes |
| PATCH | `/neuropsych-assessments/:id/battery-items/:itemId` | 🔑✍ | Atualiza item |
| DELETE | `/neuropsych-assessments/:id/battery-items/:itemId` | 🔑✍ | Remove item |
| GET | `/neuropsych-assessments/:id/ai-usage` | 🔑✍ | Cota de uso de IA consumida no período |
| GET | `/neuropsych-assessments/:id/ai-analysis` | 🔑✍ | Lista análises geradas por IA |
| POST | `/neuropsych-assessments/:id/ai-analysis` | 🔑✍ | Gera análise ("Copiloto de Raciocínio Clínico Neuropsicológico") — rascunho para revisão, nunca diagnóstico fechado |
| DELETE | `/neuropsych-assessments/:id/ai-analysis/:analysisId` | 🔑✍ | Remove análise |

Guards: `JwtAuthGuard, CsrfGuard, NoImpersonationGuard` (admin em modo "ver como" nunca acessa dados clínicos de avaliação). Ver `docs/especificacao-avaliacao-neuropsicologica.md` para o modelo clínico completo e citações regulatórias (CFP).

---

## Feedback / Depoimentos — `/feedback`

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET | `/feedback/status` | 🔑 | Status do depoimento do usuário (pending/submitted/dismissed) |
| POST | `/feedback` | 🔑✍ | Envia depoimento |
| GET | `/feedback/admin/testimonials` | 👑 | Lista todos os depoimentos (admin) |
| PATCH | `/feedback/admin/testimonials/:id` | 👑 | Aprova/rejeita para exibição pública (body: `{ approvedForPublic: boolean }`) |

---

## Admin — `/admin` 👑

Protegido por `AdminGuard` (e-mail em `ADMIN_EMAILS`).

| Método | Rota | Descrição |
|---|---|---|
| GET | `/admin/stats` | Total de usuários, ativos, MRR, breakdown plano×status |
| GET | `/admin/monitor` | Health check dos serviços integrados (DB, Resend, Asaas, WhatsApp, Push) |
| GET | `/admin/health-scores` | Health scores de todos os tenants (ativação, engajamento, risco) |
| GET | `/admin/users?page=&limit=` | Lista paginada com subscription |
| GET | `/admin/users/:id` | Detalhe do usuário |
| PATCH | `/admin/users/:id/subscription` | Override de `{status?, plan?}`; cancela/atualiza no Asaas se houver gateway |
| DELETE | `/admin/cleanup-test-users` | Remove contas de teste (e-mails com `+test` ou domínio de teste) |

## Admin Churn — `/admin/churn` 👑

| Método | Rota | Descrição |
|---|---|---|
| GET | `/admin/churn/dashboard?riskLevel=&plan=&days=` | Dashboard de churn (filtros opcionais) |
| GET | `/admin/churn/analytics` | Métricas agregadas de churn (tendências, distribuição de risco) |
| GET | `/admin/churn/alerts?resolved=` | Alertas de churn (filtro: `true`/`false`/omitido=todos) |
| PATCH | `/admin/churn/alerts/:id/resolve` | Marca alerta como resolvido |
| GET | `/admin/churn/user/:userId/risk` | Score de risco calculado para um usuário |
| GET | `/admin/churn/user/:userId/timeline` | Linha do tempo de comportamento do usuário |
| GET | `/admin/churn/user/:userId/activation` | Status de ativação do usuário |
| POST | `/admin/churn/user/:userId/send-reactivation` | Dispara e-mail de reativação manualmente |

## Admin Prospecção — `/admin/prospecting` 👑

Radar de Psicólogos — ferramenta interna de geração de leads B2B (não é uma feature vista pelos psicólogos-clientes). Desligada por padrão (`PROSPECTING_ENABLED=false`); ver `docs/PROSPECTING_RADAR.md`.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/admin/prospecting/searches/preview` | Simula uma busca (não persiste nada) |
| POST | `/admin/prospecting/searches` | Executa busca (persiste prospects descobertos) |
| GET | `/admin/prospecting/searches` | Histórico de buscas |
| GET | `/admin/prospecting/prospects` | Lista prospects (filtros de status/fonte) |
| GET | `/admin/prospecting/prospects/:id` | Detalhe |
| POST | `/admin/prospecting/prospects/:id/analyze` | Faz crawling do site próprio (se aplicável) e calcula score |
| POST | `/admin/prospecting/prospects/:id/approve` | Aprova lead |
| POST | `/admin/prospecting/prospects/:id/discard` | Descarta |
| POST | `/admin/prospecting/prospects/:id/do-not-contact` | Marca para nunca contatar |
| DELETE | `/admin/prospecting/prospects/:id` | Exclui |
| GET | `/admin/prospecting/prospects/:id/export` | Exporta dados do prospect |
| POST | `/admin/prospecting/prospects/:id/draft` | Gera rascunho de mensagem (só após aprovação; nunca envia automaticamente) |
| GET | `/admin/prospecting/metrics` | Métricas agregadas (descobertos/analisados/qualificados/aprovados) |

Guards: `JwtAuthGuard, AdminGuard`. Sem scraping de LinkedIn/PsyMeet, sem SSRF (`SsrfGuard`), sem dado sensível/de paciente, sem envio automático de mensagem.

---

## Google Calendar — `/google-calendar` 🔑✍

| Método | Rota | Descrição |
|---|---|---|
| GET | `/google-calendar/connect` | Inicia OAuth 2.0; retorna URL de autorização |
| GET | `/google-calendar/callback` | Callback OAuth; salva tokens (criptografados em `user.preferences`) |
| GET | `/google-calendar/status` | Status da integração e última sincronização |
| DELETE | `/google-calendar/disconnect` | Remove tokens e desconecta |

---

## Outros módulos

| Rota | Proteção | Descrição |
|---|---|---|
| GET `/analytics/dashboard` | 🔑 | Stats resilientes do dashboard (não falha se um módulo estiver lento) |
| GET `/audit` | 🔑 | Log de auditoria do usuário atual |
| GET `/data-export` | 🔑 | Exportação LGPD completa em PDF |
| GET/POST `/templates(/:type)` | 🔑✍ | Templates de documentos e WhatsApp |
| GET `/referral` | 🔑 | Dados do programa de indicação do usuário |
| POST `/email/webhook` | 🔓 (svix) | Webhook do Resend — bounce/reclamação; assinatura verificada via `RESEND_WEBHOOK_SECRET` |
| GET `/feedback/public` | 🔓 | Depoimentos aprovados para exibição pública (throttle 60/min) |

---

## Convenções

- **Rotas literais antes de `:id`** nos controllers (NestJS resolve na ordem de declaração).
- Todas as queries de dados clínicos filtram por `psychologistId` — isolamento total entre profissionais.
- DTOs com `whitelist: true, forbidNonWhitelisted: true`.
- Erros em pt-BR no body: `{ statusCode, message }`.
- Rate limits específicos sobrepõem o global via `@Throttle()` na rota.

---

## Notas recentes - financeiro e agendamento publico

Booking interno:

- A configuracao da pagina publica inclui foto/avatar, modalidade, duracoes por modalidade, intervalos, `minAdvanceDays`, `maxAdvanceDays`, `requirePaymentUpfront`, `pixKey` e mensagens personalizadas.
- Ao confirmar um booking, o backend cria ou reaproveita paciente, cria appointment interno e cria lancamento financeiro vinculado ao `bookingId` e `appointmentId`.
- `PATCH /booking/:id/pay` sincroniza o lancamento financeiro e sessoes vinculadas quando existirem.

Booking publico:

- `/public/booking/:slug/dates?month=YYYY-MM&modality=online|presencial`
- `/public/booking/:slug/slots?date=YYYY-MM-DD&modality=online|presencial`
- O frontend do link publico guarda localmente nome, e-mail e celular preenchidos para facilitar novos agendamentos no mesmo navegador.

Financeiro:

- `POST /financial` aceita `sessionId`, `appointmentId` e `bookingId`.
- `sessionId` deve apontar para uma sessao clinica.
- `appointmentId` deve apontar para um agendamento interno.
- `bookingId` deve apontar para um agendamento publico.
- Registros antigos que usavam `sessionId` como appointment continuam sendo reconhecidos por fallback.
- Ao marcar como pago, o backend sincroniza status de pagamento em financeiro, sessao e booking vinculado.
