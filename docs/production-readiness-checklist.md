# UseCognia Production Readiness

Checklist objetivo para validar os pontos que não devem ser automatizados com cobrança real.

## 1. E2E automático

Rodar localmente:

```bash
cd frontend
npm run test:e2e
```

O teste cria uma conta descartável em produção, ativa o plano grátis, cria paciente, registra evolução, valida financeiro/dashboard e apaga a conta no final.

Variáveis úteis:

```bash
E2E_BASE_URL=https://usecognia.com.br
E2E_API_URL=https://psicosaas-production-2d6c.up.railway.app/api
E2E_SKIP_CLEANUP=true
```

## 2. Pagamento real controlado

Não automatizar cobrança real no smoke test.

Validação recomendada:

1. Configurar ambiente sandbox Asaas com `ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3`.
2. Usar cartão de teste oficial do Asaas.
3. Criar conta teste.
4. Escolher Essencial.
5. Confirmar que a assinatura fica `trialing`.
6. Trocar para Pro e voltar para Essencial.
7. Confirmar no Asaas que `nextDueDate` segue o fim do trial, sem cobrança imediata.
8. Cancelar e confirmar que não cobra após o trial.

Produção controlada:

1. Usar um cartão próprio.
2. Criar assinatura Essencial.
3. Conferir `trialEndsAt`, `currentPeriodEnd` e assinatura no Asaas.
4. Cancelar imediatamente.
5. Confirmar ausência de cobrança ou estorno, se o gateway capturar algum valor.

## 3. Entregabilidade de e-mail

Validação mínima:

1. Cadastrar uma conta com e-mail real.
2. Confirmar recebimento de boas-vindas.
3. Clicar em reenviar verificação.
4. Confirmar recebimento do novo link.
5. Testar recuperação de senha.
6. Verificar spam/lixo eletrônico.
7. Monitorar Resend: entregues, bounces, complaints e domínio verificado.

Sinal saudável: endpoint `/auth/resend-verification` retorna `200` e Railway mostra `[Resend] Email enviado`.
