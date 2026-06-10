# UseCognia — Referência da API

Base URL produção: `https://psicosaas-production-2d6c.up.railway.app/api`

## Autenticação

- **Access token**: JWT em cookie HttpOnly `psicosaas_token` (15 min). Bearer header desabilitado.
- **Refresh token**: opaco, cookie HttpOnly, 7 dias, rotacionado a cada uso com detecção de replay.
- **CSRF**: header `x-csrf-token` obrigatório em rotas mutantes (POST/PATCH/DELETE). Token retornado no body de `/auth/login`, `/auth/register` e `/auth/me`.
- **Rate limit global**: 3 req/s + 100 req/min por IP. Login: 10 tentativas por e-mail / 15 min → 429.

Legenda de proteção: 🔓 pública · 🔑 JWT · 🔑✍ JWT + CSRF · 👑 JWT + CSRF + Admin

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

## Pacientes — `/patients`

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET | `/patients` | 🔑✍ | Lista (filtrado por psicólogo) |
| GET | `/patients/:id` | 🔑✍ | Detalhe com sessões e appointments (descriptografados) |
| GET | `/patients/:id/prontuario/export` | 🔑 | **PDF do prontuário completo** (dados, anamnese, plano, sessões) |
| POST | `/patients` | 🔑✍ | Cria (valida limite do plano) |
| PATCH | `/patients/:id` | 🔑✍ | Atualiza (criptografa `privateNotes`/`prontuario`) |
| DELETE | `/patients/:id` | 🔑✍ | Soft delete |

Campos criptografados (AES-256-GCM): `privateNotes`, `prontuario` (JSON inteiro).

## Sessões — `/sessions`

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET | `/sessions?patientId=` | 🔑✍ | Lista (opcionalmente por paciente) |
| GET | `/sessions/dashboard` | 🔑✍ | Stats do dashboard |
| GET/POST/PATCH/DELETE | `/sessions/:id` | 🔑✍ | CRUD |

Campos criptografados: `summary`, `privateNotes`, `nextSteps`.

## Agendamentos — `/appointments`

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET/POST | `/appointments` | 🔑✍ | Lista / cria (suporta recorrência via `recurringGroupId`) |
| GET/PATCH/DELETE | `/appointments/:id` | 🔑✍ | CRUD |
| PATCH | `/appointments/:id/status` | 🔑✍ | Muda status |
| PATCH | `/appointments/group/:groupId/from/:fromDate` | 🔑✍ | Edita recorrência "deste em diante" |
| DELETE | `/appointments/group/:groupId/from/:fromDate` | 🔑✍ | Exclui recorrência "deste em diante" |

## Disponibilidade — `/availability`

| Método | Rota | Descrição |
|---|---|---|
| GET / POST `/slots` | 🔑✍ | Horários por dia da semana |
| GET / POST / DELETE | `/availability/blocked(/:id)` | Bloqueios pontuais |

## Booking (interno) — `/booking`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/booking` | Solicitações recebidas |
| GET | `/booking/page` / POST `/booking/page` | Config da página pública (slug, ativo) |
| GET | `/booking/daily-link` | Link diário rotativo (token HMAC, muda à meia-noite) |
| PATCH | `/booking/:id/confirm` `/reject` `/pay` | Ações; confirmar cria paciente + appointment + lançamento |
| POST | `/booking/sync-appointments` | Sincroniza com agenda |

## Booking (público) — `/public-booking` 🔓

| Método | Rota | Descrição |
|---|---|---|
| GET | `/:slug` | Perfil público (nome, especialidade, WhatsApp) |
| GET | `/:slug/dates` / `/:slug/slots` | Datas e horários disponíveis |
| POST | `/:slug` | Solicita agendamento |
| GET | `/confirm/:token` / `/cancel/:token` | Confirmação/cancelamento pelo paciente |

## Financeiro — `/financial`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/financial` / `/financial/summary` | Lançamentos / resumo mensal |
| POST | `/financial` | Cria lançamento |
| PATCH | `/financial/:id/pay` | Marca pago |
| POST | `/financial/:id/send-charge` | Link de pagamento Asaas (cartão/PIX/boleto) |
| DELETE | `/financial/:id` | Remove |

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

## Billing — `/billing`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/billing/me` | Subscription atual ou `{status:"none"}` (normaliza trial expirado) |
| POST | `/billing/tokenize` | Tokeniza cartão no Asaas (PAN/CVV nunca persistidos) |
| POST | `/billing/subscribe` | Trial 7 dias com cartão obrigatório (`hasUsedTrial` impede repetição) |
| POST | `/billing/free` | Ativa plano free |
| POST | `/billing/change-plan` | Upgrade/downgrade |
| POST | `/billing/update-card` | Novo cartão + retry quando `past_due` |
| POST | `/billing/cancel` | `cancelAtPeriodEnd = true` |
| POST | `/billing/webhook` | 🔓 Webhook Asaas (idempotente, valida token) |
| GET | `/billing/metrics` | Contagens por status + MRR (restrito a admins) |

Estados: `trialing → active → past_due → canceled` (+ `pending`, `none`). Planos: `free`, `essencial` (R$ 79), `pro` (R$ 149).

## Admin — `/admin` 👑

Protegido por `AdminGuard` (e-mail em `ADMIN_EMAILS`).

| Método | Rota | Descrição |
|---|---|---|
| GET | `/admin/stats` | Total de usuários, ativos, MRR, breakdown plano×status |
| GET | `/admin/users?page=&limit=` | Lista paginada com subscription |
| GET | `/admin/users/:id` | Detalhe |
| PATCH | `/admin/users/:id/subscription` | Override de `{status?, plan?}`; cancela/atualiza no Asaas se houver gateway |

## Instrumentos — `/instrument-assignments`

| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| GET / POST | `/instrument-assignments` | 🔑✍ | Lista / atribui instrumento a paciente |
| PATCH | `/instrument-assignments/:id/answers` | 🔑✍ | Salva respostas |
| GET | `/public/instruments/:token` | 🔓 | Paciente abre o formulário |
| POST | `/public/instruments/:token` | 🔓 | Paciente envia respostas |

Biblioteca: 16 formulários clínicos + 13 escalas validadas (PHQ-9, GAD-7, DASS-21, PCL-5, SRQ-20, AUDIT, ISI, ESS, MEEM, WHODAS 2.0, SDQ, GAF, IES-R, C-SSRS, ASRS-v1.1).

## Outros módulos

| Rota | Descrição |
|---|---|
| GET `/analytics/dashboard` | Stats resilientes do dashboard |
| GET `/audit` | Log de auditoria do usuário |
| GET `/data-export` | Exportação LGPD completa em PDF |
| GET `/google-calendar/connect` `/callback` `/status`, DELETE `/disconnect` | OAuth 2.0 + sync (tokens criptografados em `user.preferences`) |
| GET/POST `/templates(/:type)` | Templates de documentos |
| `/notifications/*` | Status/conexão WhatsApp + teste |
| GET `/referral` | Programa de indicação |

## Convenções

- **Rotas literais antes de `:id`** nos controllers (NestJS resolve na ordem de declaração).
- Todas as queries de dados clínicos filtram por `psychologistId` — isolamento total entre profissionais.
- DTOs com `whitelist: true, forbidNonWhitelisted: true`.
- Erros em pt-BR no body: `{ statusCode, message }`.
