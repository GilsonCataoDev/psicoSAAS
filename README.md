# PsicoSaaS

> Plataforma humanizada para psicólogos — menos burocracia, mais presença.

PsicoSaaS é um SaaS completo para psicólogos brasileiros que reduz a carga operacional do consultório — gestão de pacientes, agenda, sessões clínicas, financeiro e agendamento online — para que o profissional foque no que importa: o cuidado humano.

**Demo:** [gilsoncataodev.github.io/psicoSAAS](https://gilsoncataodev.github.io/psicoSAAS)

---

## Funcionalidades

### Gestão clínica
- **Pessoas** — cadastro de pacientes com tags emocionais, pronomes, preço/duração da sessão e linha do tempo
- **Prontuário** — anamnese, plano terapêutico e anotações clínicas criptografadas
- **Sessões** — registro de cada encontro com humor, resumo, próximos passos e anotações privadas
- **Documentos** — geração de declarações, encaminhamentos e atestados com QR code de verificação

### Agenda e agendamento
- **Agenda semanal** — grade visual com sessões presenciais e online
- **Agendamento online** — link público com disponibilidade em tempo real, confirmação por e-mail e link diário rotativo (token HMAC que muda à meia-noite)
- **Confirmação automática** — ao confirmar um agendamento, cria paciente, appointment e lançamento financeiro pendente automaticamente

### Financeiro
- **Lançamentos** — controle de receitas e despesas com status (pendente / pago / em atraso)
- **Registro automático** — sessões confirmadas via link público geram lançamentos automaticamente
- **Link de pagamento** — integração com Asaas para cobrar por cartão, PIX ou boleto
- **Dashboard financeiro** — receita do mês, gráfico dos últimos 6 meses, pendências

### Dashboard
- Sessões de hoje, pessoas ativas, receita do mês e pagamentos pendentes
- Alerta de pacientes inativos há mais de 30 dias
- Gráfico de receita mensal (Recharts)

### Planos e acesso
- Plano gratuito (2 pacientes, 10 documentos) e planos pagos (Essencial / Pro)
- Período de teste de 14 dias com onboarding guiado

---

## Stack tecnológica

### Frontend
| Tecnologia | Uso |
|---|---|
| React 18 + TypeScript 5 | UI e tipagem |
| Vite | Build e dev server |
| TailwindCSS 3 | Design system (tokens sage, mist, warm) |
| TanStack Query 5 | Cache e sincronização de dados |
| Zustand 4 | Estado global (auth + onboarding) |
| React Hook Form + Zod | Formulários com validação |
| Radix UI | Componentes acessíveis (Dialog, Select, etc.) |
| Recharts | Gráficos de receita |
| Axios | HTTP client com interceptors (CSRF + refresh token) |
| date-fns | Manipulação de datas em pt-BR |
| Lucide React | Ícones |

### Backend
| Tecnologia | Uso |
|---|---|
| NestJS 10 + TypeScript | Framework principal |
| TypeORM 0.3 | ORM com PostgreSQL |
| PostgreSQL 16 | Banco de dados principal |
| JWT (HttpOnly cookie) | Access token de 15 min |
| Refresh token rotation | Token opaco de 7 dias com detecção de replay attack |
| CSRF HMAC stateless | `HMAC-SHA256(JWT_SECRET, "csrf:"+userId)` |
| bcryptjs (salt 12) | Hash de senhas |
| class-validator + class-transformer | Validação e sanitização de DTOs |
| @nestjs/throttler | Rate limiting global e por endpoint |
| Nodemailer | E-mails transacionais (confirmação, reset de senha) |

### Infraestrutura
| Serviço | Uso |
|---|---|
| Railway | Backend + PostgreSQL em produção |
| GitHub Pages | Hospedagem do frontend (SPA) |
| GitHub Actions | CI/CD automático |

---

## Segurança

| Medida | Detalhe |
|--------|---------|
| JWT em HttpOnly cookie | Token nunca exposto ao JavaScript |
| Access token de 15 min | Janela mínima de exposição em caso de vazamento |
| Refresh token rotation | Token opaco armazenado em hash SHA-256; rotacionado a cada uso |
| Replay attack detection | Token revogado reutilizado → invalida toda a sessão |
| CSRF stateless | HMAC determinístico retornado no body; comparado com `timingSafeEqual` |
| Rate limiting por e-mail | 10 tentativas de login em 15 min → 429 com retryAfter |
| Rate limiting global | 3 req/s anti-DDoS + 100 req/min por IP |
| bcrypt salt 12 | Tempo constante via hash dummy (previne timing attack em login) |
| Dados isolados por psicólogo | Todas as queries filtram por `psychologistId` |
| Anotações criptografadas | `privateNotes` e campos clínicos com AES-256-GCM |
| Validação de DTOs | `whitelist: true, forbidNonWhitelisted: true, transform: true` |
| Audit log estruturado | LOGIN_SUCCESS, LOGOUT, REFRESH_TOKEN_ROTATED, PASSWORD_RESET, etc. |
| Variáveis sensíveis em `.env` | Nunca versionadas |

---

## Estrutura do projeto

```
psicosaas/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── layout/          # AppLayout, Sidebar, TopBar, BottomNav
│       │   ├── ui/              # Avatar, Badge, Modal, StatCard, EmptyState
│       │   ├── features/
│       │   │   ├── patients/    # NewPatientModal
│       │   │   ├── agenda/      # NewAppointmentModal
│       │   │   ├── sessions/    # NewSessionModal
│       │   │   ├── financial/   # NewPaymentModal, PaymentLinkModal
│       │   │   └── prontuario/  # DocumentPreviewModal, GenerateDocModal
│       │   └── onboarding/      # OnboardingWizard
│       ├── pages/
│       │   ├── auth/            # LoginPage, RegisterPage, ForgotPassword, ResetPassword
│       │   ├── public/          # BookingPage, BookingConfirmPage, VerifyDocumentPage
│       │   ├── DashboardPage
│       │   ├── PatientsPage + PatientDetailPage
│       │   ├── AgendaPage
│       │   ├── SessionsPage
│       │   ├── DocumentosPage
│       │   ├── FinancialPage
│       │   ├── BookingManagePage
│       │   ├── SettingsPage
│       │   └── PlansPage
│       ├── hooks/               # useApi.ts — todos os hooks TanStack Query
│       ├── store/               # auth.ts (Zustand), onboarding.ts
│       ├── lib/                 # api.ts (interceptors), utils.ts, analytics.ts
│       └── types/               # Tipos globais
│
└── backend/
    └── src/
        ├── modules/
        │   ├── auth/            # JWT, refresh token, CSRF, estratégias Passport
        │   ├── patients/        # CRUD + limite de plano + criptografia
        │   ├── appointments/    # Agendamentos internos
        │   ├── sessions/        # Registros clínicos
        │   ├── financial/       # Lançamentos + integração Asaas
        │   ├── booking/         # Agendamento online público + token diário
        │   ├── availability/    # Horários disponíveis por dia da semana
        │   ├── documents/       # Geração e verificação de documentos
        │   ├── analytics/       # Dashboard stats resilientes
        │   ├── notifications/   # E-mails transacionais
        │   ├── subscriptions/   # Planos e limites
        │   ├── referral/        # Programa de indicação
        │   └── email/           # Templates e envio
        └── common/
            ├── crypto/          # encrypt.util.ts (AES-256-GCM + CSRF HMAC)
            ├── guards/          # PlanGuard global
            └── decorators/      # @RequirePlan()
```

---

## Rodando localmente

### Pré-requisitos
- Node.js 20+
- PostgreSQL 14+ (ou Docker)

### 1. Clonar e instalar

```bash
git clone https://github.com/GilsonCataoDev/psicoSAAS.git
cd psicosaas

# Instalar dependências do backend e frontend
cd backend && npm install
cd ../frontend && npm install
```

### 2. Variáveis de ambiente

```bash
# backend/.env
DATABASE_URL=postgresql://user:pass@localhost:5432/psicosaas
JWT_SECRET=sua-chave-jwt-longa-e-aleatoria
ENCRYPTION_KEY=32-bytes-hex-para-aes256
SIGN_SECRET=chave-para-tokens-publicos
NODE_ENV=development

# Opcional — e-mail transacional
SMTP_HOST=smtp.exemplo.com
SMTP_PORT=587
SMTP_USER=seu@email.com
SMTP_PASS=senha

# Opcional — link de pagamento via Asaas
# (configurado por psicólogo em Ajustes → Pagamentos)
```

```bash
# frontend/.env
VITE_API_URL=http://localhost:3001/api
VITE_USE_MOCK=false          # true para rodar sem backend
```

### 3. Banco de dados

```bash
# Com Docker
docker run -d --name psicosaas-db \
  -e POSTGRES_DB=psicosaas \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=pass \
  -p 5432:5432 postgres:16

# No backend/.env adicione:
# TYPEORM_SYNC=true   (apenas na primeira execução para criar as tabelas)
```

### 4. Iniciar

```bash
# Backend (porta 3001)
cd backend && npm run start:dev

# Frontend (porta 5173)
cd frontend && npm run dev
```

---

## Variáveis de ambiente em produção (Railway)

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | URL completa do PostgreSQL |
| `JWT_SECRET` | Segredo JWT (mínimo 32 chars, aleatório) |
| `ENCRYPTION_KEY` | Chave AES-256 em hex (64 chars hex = 32 bytes) |
| `SIGN_SECRET` | Segredo para tokens públicos de agendamento |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | URL do frontend (ex: `https://gilsoncataodev.github.io/psicoSAAS`) |
| `TYPEORM_SYNC` | `true` apenas para migrations pontuais; remover após |

---

## Design system

Paleta terapêutica definida em `tailwind.config.js`:

| Token | Hex | Uso |
|-------|-----|-----|
| `sage` | `#3f8866` | Cor primária — botões, ativo, progresso |
| `mist` | `#5577ff` | Destaque secundário — online, info |
| `warm` | `#cc7c66` | Alertas suaves |
| `sand` | `#d97c28` | Avisos, pendências |
| `neutral` | `#78786e` | Textos, bordas, fundos |

Tipografia:
- **Display:** Fraunces (serifada, acolhedora) — títulos e destaques
- **Body:** Inter (limpa, legível) — textos e interface

---

## Roadmap

### Concluído
- [x] Autenticação com JWT HttpOnly cookie + refresh token rotation
- [x] CSRF stateless + rate limiting por e-mail + audit log
- [x] Gestão de pacientes com criptografia de anotações
- [x] Prontuário clínico (anamnese, plano terapêutico)
- [x] Registro de sessões clínicas
- [x] Agenda semanal
- [x] Controle financeiro com gráficos
- [x] Agendamento online com link diário rotativo
- [x] Geração de documentos com QR code de verificação
- [x] Criação automática de lançamento financeiro ao confirmar agendamento
- [x] Integração Asaas (link de pagamento por cartão/PIX/boleto)
- [x] Sistema de planos com limites por tier
- [x] Programa de indicação (referral)
- [x] Onboarding guiado
- [x] PWA (instalável no celular)
- [x] Analytics de dashboard resiliente

### Em progresso
- [ ] E-mails transacionais completos (templates HTML)
- [ ] Lembretes de sessão por WhatsApp
- [ ] Notificações push (Web Push API)

### Próximas versões
- [ ] App mobile (React Native)
- [ ] Relatórios exportáveis em PDF
- [ ] Multi-profissional (clínica com vários psicólogos)
- [ ] Transcrição de áudio com consentimento explícito
- [ ] Resumo sugestivo de sessão por IA (sem diagnóstico)

---

## Licença

MIT — feito com cuidado no Brasil 🇧🇷
