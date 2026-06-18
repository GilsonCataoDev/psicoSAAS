# Operacao do UseCognia

Checklist pratico para manter o ambiente de producao seguro e recuperavel.

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

