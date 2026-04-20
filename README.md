# 🌿 PsicoSaaS

> Plataforma humanizada para psicólogos — menos burocracia, mais presença.

PsicoSaaS é um SaaS completo para psicólogos que reduz a carga operacional do consultório e permite que o profissional foque no que importa: o atendimento humano.

---

## ✨ Princípios do produto

- **Nunca substituir o julgamento clínico** — a IA auxilia, nunca diagnostica
- **Linguagem humanizada** — "Como foi a sessão?" em vez de "Relatório clínico"
- **Privacidade absoluta** — anotações criptografadas, conformidade com LGPD
- **Controle total do psicólogo** — seus dados são seus

---

## 🖥️ Telas

| Tela | Descrição |
|------|-----------|
| **Login / Cadastro** | Autenticação com JWT |
| **Dashboard** | Visão do dia, receita mensal, sessões recentes |
| **Pessoas** | Gestão de pacientes com tags emocionais e linha do tempo |
| **Agenda** | Grade semanal com agendamentos online e presenciais |
| **Sessões** | Registro clínico com humor, resumo e anotações privadas |
| **Financeiro** | Controle de pagamentos com PIX, cartão e cobrança empática |
| **Ajustes** | Perfil, lembretes WhatsApp, privacidade e LGPD |

---

## 🛠️ Stack tecnológica

### Frontend
| Tecnologia | Versão | Uso |
|---|---|---|
| React | 18 | UI |
| TypeScript | 5 | Tipagem |
| TailwindCSS | 3 | Estilo |
| Vite | 8 | Build |
| React Router | 6 | Navegação |
| TanStack Query | 5 | Cache de dados |
| Zustand | 4 | Estado global |
| React Hook Form + Zod | — | Formulários |
| Recharts | — | Gráficos |
| Radix UI | — | Componentes acessíveis |

### Backend
| Tecnologia | Versão | Uso |
|---|---|---|
| NestJS | 10 | Framework principal |
| TypeORM | 0.3 | ORM |
| PostgreSQL | 16 | Banco de dados |
| JWT + Passport | — | Autenticação |
| bcryptjs | — | Hash de senhas |

---

## 📁 Estrutura do projeto

```
psicosaas/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/          # AppLayout, Sidebar, TopBar, AuthLayout
│   │   │   ├── ui/              # Avatar, Badge, Modal, StatCard, EmptyState
│   │   │   └── features/
│   │   │       ├── patients/    # NewPatientModal
│   │   │       ├── agenda/      # NewAppointmentModal
│   │   │       └── sessions/    # NewSessionModal
│   │   ├── pages/
│   │   │   ├── auth/            # LoginPage, RegisterPage
│   │   │   ├── DashboardPage
│   │   │   ├── PatientsPage + PatientDetailPage
│   │   │   ├── AgendaPage
│   │   │   ├── SessionsPage
│   │   │   ├── FinancialPage
│   │   │   └── SettingsPage
│   │   ├── store/               # Zustand (auth)
│   │   ├── lib/                 # api.ts, utils.ts, mock-data.ts
│   │   └── types/               # Tipos globais + TAG_LABELS/COLORS
│   └── tailwind.config.js       # Design system (sage, mist, warm, sand)
│
├── backend/
│   └── src/
│       └── modules/
│           ├── auth/            # JWT, registro, login
│           ├── patients/        # CRUD + isolamento por psicólogo
│           ├── appointments/    # Agendamentos + trigger de lembretes
│           ├── sessions/        # Registros clínicos + dashboard stats
│           ├── financial/       # Lançamentos, pagamentos, resumo
│           └── notifications/   # Lembretes WhatsApp humanizados
│
├── database/
│   └── init.sql                 # Schema PostgreSQL completo
│
└── docker-compose.yml
```

---

## 🚀 Como rodar

### Pré-requisitos
- Node.js 20+
- Docker e Docker Compose (para o banco)

### 1. Instalar dependências

```bash
# Da raiz do projeto
npm run install:all
```

### 2. Banco de dados

```bash
docker-compose up -d postgres
```

### 3. Backend

```bash
cd backend
cp .env.example .env        # Edite as variáveis
npm run start:dev
# API disponível em http://localhost:3001/api
```

### 4. Frontend

```bash
# Da raiz
npm run dev
# Ou diretamente:
cd frontend && npm run dev
# App disponível em http://localhost:3000
```

---

## 🔐 Segurança e LGPD

| Medida | Status |
|--------|--------|
| Senhas com bcrypt (salt 12) | ✅ |
| JWT com expiração de 7 dias | ✅ |
| Dados isolados por psicólogo | ✅ |
| Anotações clínicas marcadas para criptografia AES-256 | ✅ |
| Tabela `consent_records` (LGPD) | ✅ |
| CORS configurado | ✅ |
| Validação de DTOs com class-validator | ✅ |
| Variáveis sensíveis em `.env` | ✅ |

> ⚠️ **Antes de ir para produção:** implemente a criptografia AES-256-GCM nas anotações clínicas (`privateNotes`, `summary`) na camada de serviço, antes de persistir no banco.

---

## 🎨 Design System

Paleta acolhedora definida em `tailwind.config.js`:

| Token | Hex base | Uso |
|-------|----------|-----|
| `sage` | `#3f8866` | Cor primária — botões, ativo, progresso |
| `mist` | `#5577ff` | Destaque secundário — online, info |
| `warm` | `#cc7c66` | Alertas suaves |
| `sand` | `#d97c28` | Avisos, pendências |
| `neutral` | `#78786e` | Textos, bordas, fundos |

Tipografia:
- **Display:** Fraunces (serifada, acolhedora) — títulos
- **Body:** Inter (limpa, legível) — textos gerais

---

## 📋 Roadmap do MVP → Produção

### Fase 1 — MVP (atual)
- [x] Autenticação JWT
- [x] Gestão de pessoas (pacientes)
- [x] Agenda semanal
- [x] Registro de sessões
- [x] Controle financeiro básico

### Fase 2 — Integrações
- [ ] WhatsApp API (lembretes automáticos humanizados)
- [ ] Mercado Pago / PIX (cobrança integrada)
- [ ] Agendamento online (link público para paciente)

### Fase 3 — IA Ética
- [ ] Transcrição de áudios (com consentimento explícito)
- [ ] Resumo automático de sessões (sugestivo, nunca diagnóstico)
- [ ] Organização de anotações

### Fase 4 — Escala
- [ ] Multi-tenancy
- [ ] Planos e billing (Stripe)
- [ ] App mobile (React Native)
- [ ] Relatórios exportáveis (PDF)

---

## 🤝 Contribuindo

Contribuições são bem-vindas, especialmente de profissionais da área de saúde mental que queiram ajudar a refinar a linguagem e os fluxos.

---

## 📄 Licença

MIT — feito com cuidado no Brasil 🇧🇷
