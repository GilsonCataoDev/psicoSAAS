# UseCognia Onboarding Flow

Meta: levar o novo usuario de 0 a primeira sessao registrada com prontuario em menos de 15 minutos e menos de 10 cliques principais.

## Fluxo ASCII

```text
Signup/Login
  -> Boas-vindas (30s)
  -> Conectar WhatsApp (opcional, 2min)
  -> Criar 1o paciente (2min)
  -> Agendar 1a sessao (2min)
  -> Registrar 1a sessao + nota breve (5min)
  -> Sucesso: "primeira sessao registrada"
  -> Proximo passo: gerar documento ou ativar link publico
```

## Etapas

### 1. Login/signup

Campos obrigatorios:
- Nome
- Email
- Senha
- CRP

Copy:
- "Crie sua conta e organize seu consultorio em poucos minutos."

Proximo passo:
- Ir para boas-vindas.

Pode pular?
- Nao.

Validacao:
- Email unico.
- Senha minima.
- CRP em formato valido.
- Se falhar: mostrar erro no proprio campo.

Tempo estimado: 1 minuto.

### 2. Boas-vindas interativo

Campos obrigatorios:
- Nenhum.

Copy:
- "Vamos configurar o essencial: paciente, agenda e primeira sessao. WhatsApp pode ficar para depois."

Proximo passo:
- "Comecar setup".

Pode pular?
- Sim.

Validacao:
- Se pular, usuario cai no dashboard com checklist.

Tempo estimado: 30 segundos.

### 3. Conectar WhatsApp

Campos obrigatorios:
- Nenhum se pular.
- QR Code se conectar.

Copy:
- "Conecte o WhatsApp para enviar lembretes pelo seu numero. Opcional agora."

Proximo passo:
- Criar paciente.

Pode pular?
- Sim.

Validacao:
- Se QR expirar, gerar novo QR.
- Se API falhar, seguir onboarding sem bloquear.

Tempo estimado: 2 minutos.

### 4. Criar primeiro paciente

Campos obrigatorios:
- Nome

Campos recomendados:
- Telefone
- Email

Copy:
- "Cadastre apenas o necessario. Voce pode completar depois."

Proximo passo:
- Agendar primeira sessao.

Pode pular?
- Nao para atingir aha moment.

Validacao:
- Nome obrigatorio.
- Telefone/email opcionais.

Tempo estimado: 2 minutos.

### 5. Agendar primeira sessao

Campos obrigatorios:
- Paciente
- Data
- Hora
- Duracao

Copy:
- "Agora coloque a primeira sessao na agenda."

Proximo passo:
- Registrar sessao.

Pode pular?
- Sim, mas reduz chance de ativacao.

Validacao:
- Data/hora validas.
- Se conflito, sugerir outro horario.

Tempo estimado: 2 minutos.

### 6. Registrar primeira sessao

Campos obrigatorios:
- Paciente
- Data
- Nota breve

Copy:
- "Registre o essencial em 30 segundos. Depois voce pode detalhar."

Proximo passo:
- Tela de sucesso.

Pode pular?
- Nao para completar onboarding.

Validacao:
- Paciente obrigatorio.
- Nota pode ser curta.

Tempo estimado: 5 minutos.

### 7. Sucesso

Campos obrigatorios:
- Nenhum.

Copy:
- "Primeira sessao registrada. Agora seu consultorio ja tem historico clinico organizado."

Proximo passo sugerido:
- Gerar documento.
- Ativar link publico.
- Exportar dados.

Pode pular?
- Nao aplicavel.

Validacao:
- Exibir apenas apos sessao criada.

Tempo estimado: 30 segundos.

## Aha Moment

Escolha principal: Opcao C, quando o psicologo registra a primeira sessao em menos de 30 segundos e ve isso aparecer no historico do paciente.

Motivo:
- Prova valor central: organizacao clinica imediata.
- Nao depende de WhatsApp, pagamento ou volume de dados.
- Funciona para iniciante e profissional consolidado.

Disparo:
- Apos criar a primeira sessao.
- Mostrar modal/banner: "Primeira sessao registrada".

## KPIs

- Signup -> primeiro paciente: meta 70% em 7 dias.
- Signup -> primeira sessao agendada: meta 55% em 7 dias.
- Signup -> primeira sessao registrada: meta 40% em 7 dias.
- Tempo mediano ate primeiro paciente: meta < 5 min.
- Tempo mediano ate primeira sessao registrada: meta < 15 min.
- % que conecta WhatsApp no onboarding: meta 35%.
- % que volta no dia seguinte: meta 45%.

## Cliques Principais Alvo

1. Comecar setup
2. Criar paciente
3. Salvar paciente
4. Agendar sessao
5. Salvar agendamento
6. Registrar sessao
7. Salvar sessao
8. Ver historico

Total: 8 cliques principais.
