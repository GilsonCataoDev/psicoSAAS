# UseCognia — Referência da API

Base URL produção: `https://psicosaas-production-2d6c.up.railway.app/api`

## Autenticação

- **Access token**: JWT em cookie HttpOnly `psicosaas_token` (15 min). Bearer header desabilitado.
- **Refresh token**: opaco, cookie HttpOnly, 7 dias, rotacionado a cada uso com detecção de replay.
- **CSRF**: header `x-csrf-token` obrigatório em rotas mutantes (POST/PATCH/DELETE). Token retornado no body de `/auth/login`, `/auth/register` e `/auth/me`.
- **Rate limit global**: 3 req/s + 100 req/min por IP. Login: 10 tentativas por e-mail / 15 min → 429.

Legenda de proteção: 🔓 pública · 🔑 JWT · 🔑✍ JWT + CSRF · 👑 JWT + CSRF + Admin

---

## Auth — `/auth`

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| POST | `/auth/register` | 🔓 | Cadastro (requer `termsAccepted`); envia e-mail de verificação |
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
| GET | `/booking` | 🔑✍ | Solicitações recebidas |
| GET | `/booking/page` | 🔑✍ | Config da página pública (slug, ativo) |
| POST | `/booking/page` | 🔑✍ | Salva config |
| GET | `/booking/daily-link` | 🔑✍ | Link diário rotativo (token HMAC, muda à meia-noite) |
| PATCH | `/booking/:id/confirm` | 🔑✍ | Confirma; cria paciente + appointment + lançamento financeiro |
| PATCH | `/booking/:id/reject` | 🔑✍ | Rejeita |
| PATCH | `/booking/:id/pay` | 🔑✍ | Marca pago |
| POST | `/booking/sync-appointments` | 🔑✍ | Sincroniza com agenda interna |

## Booking Público — `/public-booking` 🔓

| Método | Rota | Descrição |
|---|---|---|
| GET | `/public-booking/:slug` | Perfil público (nome, especialidade, avatar, WhatsApp) |
| GET | `/public-booking/:slug/dates` | Datas disponíveis no mês |
| GET | `/public-booking/:slug/slots` | Horários disponíveis numa data |
| POST | `/public-booking/:slug` | Solicita agendamento; envia e-mail com token de confirmação/cancelamento |
| GET | `/public-booking/confirm/:token` | Paciente confirma pelo link no e-mail |
| GET | `/public-booking/cancel/:token` | Paciente cancela pelo link no e-mail |

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

---

## Convenções

- **Rotas literais antes de `:id`** nos controllers (NestJS resolve na ordem de declaração).
- Todas as queries de dados clínicos filtram por `psychologistId` — isolamento total entre profissionais.
- DTOs com `whitelist: true, forbidNonWhitelisted: true`.
- Erros em pt-BR no body: `{ statusCode, message }`.
- Rate limits específicos sobrepõem o global via `@Throttle()` na rota.
