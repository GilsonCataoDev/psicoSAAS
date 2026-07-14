# Changelog — UseCognia

Todas as mudanças significativas do projeto. Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [Não lançado]

### Adicionado
- Rascunho de prontuario por IA no fluxo de evolucao clinica, com preview antes de salvar.
- Tracking mensal de custo de IA em `ai_usage`: tokens de entrada, tokens de saida e custo estimado em micros de dolar.
- `AdvisoryLockService` com `pg_try_advisory_lock` para prevenir execução duplicada de jobs em múltiplas instâncias
- Todos os 5 background jobs protegidos por advisory lock + flag intra-processo `this.running`
- Webhook do Resend (`POST /email/webhook`, assinatura Svix) com lista de supressão (`email_suppressions`): bounce permanente e reclamação de spam bloqueiam envios futuros para o mesmo endereço
- E-mails agora incluem versão texto-puro, `reply-to` e cabeçalho `List-Unsubscribe`, reduzindo pontuação de spam
- Referral de mão dupla: quem se cadastra por link de indicação ganha 30 dias de Pro imediatamente, além da recompensa existente do indicador
- Endpoint público `GET /feedback/public`: depoimentos aprovados exibidos na landing (antes eram fictícios)
- `public/llms.txt` para motores de resposta de IA (ChatGPT, Claude, Perplexity)

### Corrigido
- Resumo/rascunho de IA liberado a partir do plano Essencial, alinhando regra de backend com a proposta comercial.
- Removido `aggregateRating` fabricado (4.9/47 reviews) do schema.org da landing — dado falso sem lastro real, risco de penalização do Google
- Card de depoimentos ilegível em dark mode na landing (fundo herdava regra global do app autenticado)
- "Horários disponíveis" na Agenda mostrava dias já passados da semana como livres para agendar

---

## [0.10.0] - 2026-07-04

### Adicionado
- Onboarding simples com 3 blocos: objetivo principal, forma de uso e quantidade de pacientes.
- Proximos passos personalizados no dashboard com base nas respostas do onboarding.
- Posicionamento do produto ampliado para psicologos e terapeutas.
- Link publico de agendamento com exibicao de datas disponiveis no mes.
- Resumo de disponibilidade para o profissional ver dias e horarios livres.
- Lista de pacientes do dia na agenda, ordenada por horario.
- Perfil/foto do profissional para aparecer no link publico de agendamento.
- Preenchimento automatico de nome, e-mail e celular no agendamento publico quando o paciente ja agendou antes no mesmo navegador.
- Migration `NormalizeFinancialLinks1782600000000` para normalizar vinculos financeiros com `sessionId`, `appointmentId` e `bookingId`.
- Indices de performance para financeiro, agenda, bookings, disponibilidade e bloqueios.
- Checks no banco para tipo, status e metodo de pagamento em `financial_records`.

### Melhorado
- Fluxo financeiro agora diferencia sessao, appointment e booking, mantendo fallback para registros antigos.
- Marcacao de pagamento sincroniza sessao, booking publico e lancamento financeiro de forma consistente.
- Agendamento publico cria lancamento financeiro com vinculo explicito ao booking e ao appointment.
- `requirePaymentUpfront` passa a ser considerado no fluxo publico para envio de cobranca antecipada quando autoCharge e PIX estao configurados.
- Mensagens de confirmacao/cancelamento podem ser editadas antes do envio com link gerado pelo sistema.
- Dashboard e selects receberam ajustes de dark mode.
- Receita e graficos financeiros passaram a considerar apenas receitas, sem misturar despesas.

### Corrigido
- Lancamento manual no financeiro deixava de funcionar quando o frontend enviava campos nao aceitos pelo DTO.
- Cobranca de booking publico podia usar mensagem generica ou nao sincronizar corretamente com status de pagamento.
- Plural incorreto de "sessoes" no dashboard.
- Redirecionamento indevido para `/planos` apos login.
- Responsividade e contraste de cards no dashboard em dark mode.
- Link publico de agendamento com problemas de navegacao/confirmacao.

### Operacao
- Apos deploy do backend, rodar `npm run migration:run` no ambiente Railway para aplicar as colunas e indices novos.

---

## [0.9.0] — 2026-06-27

### Adicionado
- **Módulo de Churn**: score de risco por tenant, alertas automáticos, nudges de reativação, dashboard admin com filtros por risco/plano
- **Módulo de Depoimentos** (`/feedback`): coleta, aprovação admin e exibição pública
- **Health scores** no painel admin: métricas de ativação e engajamento por conta
- **Monitor de serviços** em `/admin/monitor`: status de DB, Resend, Asaas, WhatsApp e Push

### Melhorado
- Split de `useApi.ts` (967 linhas) em 15 arquivos de domínio com barrel re-export retrocompatível
- Split de `SettingsPage.tsx` (1361 linhas) em 9 componentes de tab separados

### Corrigido
- IDOR em `GET /sessions/:id`: guard movido para a query (`{ where: { id, psychologistId } }`)
- Logs de erro do Google Calendar: `console.error` substituído por `Logger.warn` estruturado

---

## [0.8.0] — 2026-06-25

### Adicionado
- **Biblioteca de Instrumentos Clínicos**: 16 formulários + 13 escalas validadas (PHQ-9, GAD-7, DASS-21, PCL-5, SRQ-20, AUDIT, ISI, ESS, MEEM, WHODAS 2.0, SDQ, GAF, IES-R, C-SSRS, ASRS-v1.1)
- Link público para paciente responder instrumento (`/public/instruments/:token`)
- **Painel admin** (`/admin`): stats de usuários, MRR, listagem paginada, override de assinatura
- Throttle específico no export de prontuário: 5 requisições por hora por usuário

### Melhorado
- Endpoint `/patients/:id/prontuario/export` migrado de throttle global para `@Throttle({ long: { limit: 5, ttl: 3600000 } })`

---

## [0.7.0] — 2026-06-21

### Adicionado
- **Notificações Push** (Web Push API + VAPID): subscribe, unsubscribe, test, lembretes de sessão
- Lembretes de sessão por WhatsApp: 24h e 2h antes com fallback para e-mail e push
- **Resumo diário da agenda** por WhatsApp (opt-in por psicólogo)
- Background job `AppointmentReminderJob` com lógica de retry e rate-limit do provedor de e-mail
- Background job `PaymentReminderJob`: marca `overdue` após 3 dias e notifica por WhatsApp
- Background job `BillingTrialEmailJob`: aviso D-2 e D-0 do trial
- Background job `BillingReconciliationJob`: reconcilia status com Asaas a cada 30 min
- `EmailService.isRateLimited()` e `getRateLimitRetryAfterMs()` para pausar envios sob limite

### Melhorado
- `WhatsAppDeliveryResult` com campo `nonRetryable` para evitar retry de números inválidos

---

## [0.6.0] — 2026-06-09

### Adicionado
- **Google Calendar**: integração OAuth 2.0 bidirecional; tokens criptografados em `user.preferences`
- Sincronização de agendamentos internos com eventos do Google Calendar
- Portal do paciente (`/patient-portal/:token`): paciente preenche anamnese via link

### Melhorado
- Exportação completa do prontuário em PDF: dados, anamnese, plano terapêutico e todas as sessões

---

## [0.5.0] — 2026-06-02

### Adicionado
- **Agendamento online público**: página de perfil com avatar, especialidade e botões "Agende agora" / WhatsApp
- Link diário rotativo (token HMAC que muda à meia-noite)
- Confirmação automática: ao aceitar um agendamento cria paciente, appointment e lançamento financeiro
- Token de confirmação/cancelamento por e-mail (expira em 48h)

---

## [0.4.0] — 2026-05-15

### Adicionado
- **Agendamentos recorrentes**: séries semanais com edição/exclusão "deste em diante" (`recurringGroupId`)
- **Documentos**: geração de declarações, encaminhamentos e atestados com QR code de verificação HMAC-SHA256
- Envio de documentos por e-mail (Resend, anexo base64)
- Verificação pública de autenticidade em `/documents/verify/:code`

---

## [0.3.0] — 2026-04-28

### Adicionado
- **Módulo de Billing** (Asaas): tokenização de cartão, subscriptions, webhook idempotente
- Trial de 7 dias com flag `hasUsedTrial` para impedir repetição
- `SubscriptionGuard`: bloqueia acesso a usuários `canceled` / `past_due` sem grace period
- Controle de acesso por plano com `@RequirePlan()` decorator
- Programa de indicação (`referral`)
- **PWA** (VitePWA) com `injectRegister: null` para compatibilidade com GitHub Pages

---

## [0.2.0] — 2026-04-15

### Adicionado
- **Ditado por voz** nos campos clínicos (Web Speech API, pt-BR)
- **Controle financeiro**: lançamentos, resumo mensal, gráfico Recharts, link de pagamento Asaas
- Dashboard com sessões de hoje, pacientes ativos, receita do mês e alertas de inatividade
- Onboarding guiado com checklist de 5 etapas

---

## [0.1.0] — 2026-03-01

### Adicionado
- Autenticação com JWT HttpOnly cookie + refresh token rotation com detecção de replay attack
- CSRF stateless (HMAC-SHA256 determinístico)
- Rate limiting global (3 req/s, 100 req/min) e por e-mail (10 tentativas / 15 min)
- Audit log: LOGIN_SUCCESS, LOGOUT, REFRESH_TOKEN_ROTATED, PASSWORD_RESET, etc.
- Gestão de pacientes com tags emocionais, pronomes e linha do tempo
- Prontuário clínico (anamnese, plano terapêutico) criptografado (AES-256-GCM)
- Registro de sessões clínicas com humor, resumo e anotações privadas
- Agenda semanal com grade visual
- Exportação LGPD de dados (`/data-export`)
- Política de Privacidade v2.0 com 20 seções em conformidade com a LGPD
