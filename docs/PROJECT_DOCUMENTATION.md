# UseCognia - Documentacao do Projeto

## 1. Visao Geral

UseCognia e um SaaS para psicologos e terapeutas que centraliza agenda, pacientes, prontuario, evolucoes, documentos, instrumentos clinicos, financeiro, agendamento publico e notificacoes.

O produto lida com dados sensiveis de saude mental, entao as decisoes tecnicas priorizam:

- isolamento dos dados por psicologo;
- autenticacao com cookies HttpOnly;
- criptografia de campos clinicos;
- audit log para acoes sensiveis;
- controle de acesso por plano;
- cuidado com LGPD e minimizacao de exposicao de dados.

URLs principais:

- Site: `https://usecognia.com.br`
- API: `https://psicosaas-production-2d6c.up.railway.app/api`
- Repositorio: `GilsonCataoDev/psicoSAAS`

## 2. Stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Radix UI
- Recharts
- Axios
- Capacitor/PWA

### Backend

- NestJS
- TypeScript
- TypeORM
- PostgreSQL
- JWT em cookie HttpOnly
- Refresh token rotation
- CSRF stateless
- class-validator/class-transformer
- Throttler
- Helmet
- PDFKit
- Resend
- Asaas
- Evolution API
- Web Push

### Infraestrutura

- Vercel: frontend SPA/PWA em `usecognia.com.br`, com rewrite `/api`
- Railway: backend, PostgreSQL, Redis e Evolution API
- GitHub: repositorio, backups e E2E agendado
- Dominio: `usecognia.com.br`

## 3. Estrutura do Repositorio

```txt
psicosaas/
  backend/                 API NestJS
  frontend/                Aplicacao React/PWA/Capacitor
  database/                Arquivos auxiliares de banco, quando usados
  docs/                    Documentacao tecnica e operacional
  docker-compose.yml       Ambiente local auxiliar
  README.md                Visao geral do produto
```

### Backend

```txt
backend/src/
  common/                  Guards, decorators, crypto, utilitarios HTTP
  modules/
    admin/                 Painel administrativo
    analytics/             Indicadores do dashboard
    appointments/          Agenda interna e recorrencia
    audit/                 Logs de auditoria
    auth/                  Login, refresh, CSRF e perfil
    availability/          Disponibilidade da agenda publica
    billing/               Planos, trial, Asaas e webhooks
    booking/               Link publico de agendamento
    data-export/           Exportacao LGPD
    documents/             Documentos PDF e verificacao publica
    email/                 Templates/envio via Resend
    financial/             Receitas, despesas e cobrancas
    google-calendar/       OAuth e sincronizacao Google Calendar
    instrument-assignments/ Instrumentos clinicos e respostas publicas
    notifications/         WhatsApp, push e logs de envio
    patients/              Pacientes e prontuario
    referral/              Indicacoes
    sessions/              Evolucoes/sessoes clinicas
    templates/             Modelos reutilizaveis
```

### Frontend

```txt
frontend/src/
  components/              Componentes de layout, UI e features
  hooks/                   Hooks de API com TanStack Query
  lib/                     API client, analytics, helpers
  pages/                   Telas principais
  store/                   Zustand auth/onboarding
  types/                   Tipos compartilhados do frontend
```

## 4. Funcionalidades do Produto

### Pacientes e Prontuario

- Cadastro de pacientes.
- Organizacao alfabetica.
- Status de paciente: ativo, inativo e alta.
- Campos de perfil, incluindo dados clinicos e informacoes adicionais.
- Valor cobrado por paciente.
- Prontuario individual.
- Evolucoes/sessoes vinculadas ao paciente.
- Exportacao do prontuario em PDF.

### Agenda

- Grade semanal no desktop.
- Lista diaria no mobile.
- Agendamento presencial ou online.
- Agendamentos recorrentes.
- Edicao/exclusao de recorrencia a partir de uma data.
- Acoes rapidas direto no agendamento:
  - evoluir;
  - marcar como finalizada;
  - registrar falta;
  - enviar WhatsApp;
  - editar;
  - remover;
  - abrir prontuario.

### Agendamento Publico

- Pagina publica por profissional.
- Link publico de agendamento.
- Horarios disponiveis conforme configuracao.
- Confirmacao/cancelamento por token.
- Criacao automatica de paciente, agendamento e lancamento financeiro quando aplicavel.

### Sessoes e Evolucoes

- Registro de evolucao clinica.
- Campos sensiveis criptografados no backend.
- Associacao com paciente e, quando aplicavel, com appointment.
- Ditado por voz nos campos clinicos.

### Instrumentos Clinicos

- Biblioteca de instrumentos e escalas.
- Envio por link publico.
- Resposta pelo paciente.
- Resultados vinculados ao profissional.
- Impressao/exportacao em PDF pelo frontend.

### Documentos

- Geracao de documentos clinicos.
- PDF com QR code de verificacao.
- Verificacao publica de autenticidade.
- Envio por e-mail.

### Financeiro

- Receitas e despesas.
- Status de pagamento.
- Resumo financeiro.
- Link de cobranca via Asaas.
- Criacao automatica de lancamentos em alguns fluxos.

### Planos e Billing

- Plano Free.
- Plano Essencial.
- Plano Pro.
- Trial de 7 dias com cartao.
- Renovacao a cada 30 dias.
- Troca de plano pelo fluxo de billing.
- Webhook Asaas para atualizar status de pagamento.
- Bloqueio por assinatura quando necessario.

### Notificacoes

- E-mails transacionais via Resend.
- WhatsApp via Evolution API.
- Logs simples de envio.
- Notificacoes push via Web Push.

### Admin

- Painel `/admin` restrito por `ADMIN_EMAILS`.
- Estatisticas gerais.
- Listagem de usuarios.
- Visualizacao de assinatura.
- Override de plano/status quando necessario.

## 5. Fluxos Principais

### Cadastro e Trial

1. Usuario cria conta.
2. Backend cria usuario e envia verificacao de e-mail.
3. Usuario escolhe plano.
4. Para trial pago, frontend envia dados ao backend para tokenizar no Asaas.
5. Backend cria subscription local e assinatura no gateway.
6. Usuario acessa conforme status do plano.
7. Ao fim do trial, a cobranca ocorre no ciclo configurado.

### Login

1. Frontend envia e-mail e senha para `/auth/login`.
2. Backend valida credenciais.
3. Backend seta access token e refresh token em cookies HttpOnly.
4. Backend retorna usuario seguro e `csrfToken`.
5. Frontend guarda apenas dados minimos do usuario.

### Refresh Token

1. Quando o access token expira, frontend chama `/auth/refresh`.
2. Backend valida refresh token opaco.
3. Token antigo e revogado.
4. Novo refresh token e emitido.
5. Reuso de token revogado indica replay e invalida sessoes.

### Agendamento Interno

1. Psicologo cria appointment.
2. Appointment pode ser unico ou recorrente.
3. Na agenda, o profissional pode evoluir, finalizar, registrar falta ou abrir prontuario.
4. Evolucao criada a partir da agenda ja recebe dados do appointment.

### Agendamento Publico

1. Paciente abre link publico.
2. Sistema exibe datas e horarios disponiveis.
3. Paciente confirma o agendamento no proprio link publico.
4. Sistema cria paciente, appointment e lancamento financeiro pendente.
5. Psicologo recebe a notificacao e pode cancelar, remarcar ou registrar pagamento.

### WhatsApp

1. Psicologo conecta uma instancia da Evolution API.
2. Sistema associa a instancia ao usuario.
3. Lembretes ou mensagens usam apenas a instancia do proprio psicologo.
4. Envios sao registrados com data, paciente, tipo e status.

## 6. Seguranca e LGPD

Medidas atuais:

- JWT em cookie HttpOnly.
- Refresh token rotation.
- CSRF em rotas mutantes.
- Rate limiting global e em rotas sensiveis.
- Helmet no backend.
- CORS controlado por variaveis.
- Campos clinicos criptografados.
- Queries filtradas por `psychologistId`.
- AdminGuard no backend, nao apenas no frontend.
- Audit logs para acoes sensiveis.
- Exportacao LGPD autenticada e limitada.
- Webhook Asaas exige token em producao.
- Payloads de webhook sanitizados antes de persistir.
- Analytics sem session recording/autocapture.

Cuidados obrigatorios:

- Nunca versionar `.env`.
- Nunca logar prontuario, evolucoes, CPF, dados financeiros ou payload bruto de gateway.
- Toda query de dado clinico deve filtrar por dono da conta.
- Listagens devem retornar apenas campos necessarios.
- Segredos devem ficar no Railway ou ambiente seguro.

## 7. Variaveis de Ambiente

### Backend

Principais:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `SIGN_SECRET`
- `FRONTEND_URL`
- `ALLOWED_ORIGINS`
- `ADMIN_EMAILS`
- `ASAAS_API_KEY`
- `ASAAS_BASE_URL`
- `ASAAS_WEBHOOK_TOKEN`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `WHATSAPP_API_URL`
- `WHATSAPP_API_KEY`
- `WHATSAPP_INSTANCE_PREFIX`
- `WEB_PUSH_PUBLIC_KEY`
- `WEB_PUSH_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT`
- `SENTRY_DSN`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GROQ_API_KEY`

Referencia: `backend/.env.example`.

### Frontend

Principais:

- `VITE_API_URL`
- `VITE_USE_MOCK`
- `VITE_POSTHOG_KEY`
- `VITE_POSTHOG_HOST`

Referencia: `frontend/.env.example`.

## 8. Como Rodar Localmente

### Pre-requisitos

- Node.js 20+
- PostgreSQL
- npm

### Instalar dependencias

```bash
cd backend
npm install

cd ../frontend
npm install
```

### Backend

```bash
cd backend
npm run build
npm run migration:run
npm run start:dev
```

API local:

```txt
http://localhost:3001/api
```

### Frontend

```bash
cd frontend
npm run dev
```

App local:

```txt
http://localhost:5173
```

## 9. Testes e Validacao

### Backend

```bash
cd backend
npm test
npm run test:cov
npm run build
```

### Frontend

```bash
cd frontend
npm run build
npm run test:e2e
```

### Checklist antes de deploy

- Build do backend passou.
- Build do frontend passou.
- Migrations revisadas.
- `.env.example` atualizado se variavel nova foi criada.
- Fluxo alterado foi testado manualmente.
- Rotas mutantes continuam usando CSRF.
- Dados sensiveis nao aparecem em logs.
- `git status` limpo antes de encerrar.

## 10. Deploy

### Backend

Deploy atual pelo Railway, a partir da branch `main`.

Comandos uteis:

```bash
railway status
railway service list --json
railway logs
```

Fluxo comum:

```bash
git add .
git commit -m "Mensagem objetiva"
git push origin main
```

Depois verificar no Railway se o deploy ficou `SUCCESS`.

### Frontend

Deploy atual pela Vercel, a partir da branch `main`.

O frontend e gerado por Vite e servido como SPA/PWA. O build gera assets versionados em `frontend/dist`.
O `vercel.json` usa `VITE_API_URL=/api` e reescreve `/api/*` para a API no Railway.

Comando:

```bash
cd frontend
npm run build
```

## 11. Banco de Dados e Migrations

O backend usa TypeORM.

Comandos:

```bash
cd backend
npm run build
npm run migration:show
npm run migration:run
```

Regras:

- Nao usar `synchronize=true` em producao.
- Alteracao estrutural de entidade deve ter migration.
- Cuidado extra com campos criptografados: mudancas podem exigir migracao de dados.

## 12. Operacao e Suporte

### Problemas de login

Verificar:

- usuario existe;
- e-mail verificado;
- cookies aceitos pelo navegador;
- CORS e `FRONTEND_URL`;
- logs de `/auth/login`, `/auth/me` e `/auth/refresh`.

### Problemas de plano

Verificar:

- `/billing/me`;
- status local da subscription;
- status no Asaas;
- webhooks recebidos;
- `ASAAS_WEBHOOK_TOKEN`;
- painel admin para override emergencial.

### Problemas de e-mail

Verificar:

- `RESEND_API_KEY`;
- `RESEND_FROM`;
- dominio verificado no Resend;
- registros DNS;
- logs do backend.

### Problemas de WhatsApp

Verificar:

- Evolution API online;
- Redis da Evolution configurado;
- `WHATSAPP_API_URL`;
- `WHATSAPP_API_KEY`;
- endpoint de debug de notificacoes;
- status da instancia do usuario.

### Problemas de PDF

Verificar:

- endpoint retorna `application/pdf`;
- `Content-Disposition` correto;
- blob download no frontend;
- pop-up bloqueado pelo navegador, quando for impressao via janela;
- fallback por iframe nos instrumentos.

## 13. PWA e Mobile

O projeto ja possui PWA:

- manifest;
- service worker;
- build com `vite-plugin-pwa`;
- suporte a instalacao no celular.

Tambem ha estrutura Capacitor:

- Android em `frontend/android`;
- iOS em `frontend/ios`;
- scripts em `frontend/package.json`.

Comandos uteis:

```bash
cd frontend
npm run cap:sync
npm run cap:sync:ios
npm run cap:open:ios
npm run cap:open:android
```

## 14. Roadmap Tecnico

Prioridades recomendadas:

1. E2E automatico para auth, plano, agenda e prontuario.
2. Monitoramento real de e-mail e eventos de billing.
3. Melhorias no painel admin para suporte.
4. App iOS via Capacitor/TestFlight.
5. App Android quando houver aparelho para teste real.
6. Transcricao de audio com IA, somente apos controle de custo e consentimento claro.
7. Relatorios e exportacoes clinicas mais completas.

## 15. Documentos Relacionados

- `README.md`: apresentacao geral e stack.
- `docs/API.md`: referencia de endpoints.
- `docs/production-readiness-checklist.md`: checklist de producao.
- `docs/MOBILE_APP_ROADMAP.md`: roadmap mobile.
- `docs/IOS_APP_CHECKLIST.md`: checklist iOS.
- `docs/instagram/guia-identidade-instagram.md`: identidade visual para Instagram.

