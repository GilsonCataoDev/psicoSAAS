# Checklist de Privacidade — Radar de Psicólogos

> **Aviso**: este documento é um template de apoio operacional. Ele **não
> substitui revisão jurídica**. Antes de habilitar `PROSPECTING_ENABLED=true`
> em produção com um provedor de busca real, submeta este checklist e o
> teste de legítimo interesse abaixo à área jurídica/DPO da empresa.

## Base legal

O tratamento de dados neste módulo se apoia em **legítimo interesse**
(art. 10, LGPD) para dados **profissionais publicados publicamente** pelo
próprio psicólogo (site profissional, perfil público no LinkedIn, perfil
público no PsyMeet), com finalidade de prospecção B2B para uma ferramenta
relacionada à própria atividade profissional do titular.

Cada `Prospect` grava `privacyBasis` explicitamente
(`legitimate_interest_public_professional_data`).

## Template de teste de legítimo interesse (LIA)

Preencher antes de habilitar coleta com provedor real:

1. **Finalidade**: prospecção comercial B2B de psicólogos para oferecer uma
   ferramenta gratuita (evolução psicológica) relacionada à atividade
   profissional do titular.
2. **Necessidade**: por que não há alternativa menos invasiva? (ex: já se
   restringe a dados publicados publicamente pelo próprio profissional, com
   finalidade diretamente relacionada à profissão exercida)
3. **Balanceamento**: o titular é um profissional atuando publicamente nessa
   condição; a expectativa razoável de contato comercial relacionado à sua
   profissão é maior do que a de um consumidor final. Ainda assim, avaliar:
   - Volume de contatos e frequência (nesta versão, contato é sempre manual
     e revisado por humano, nunca automático).
   - Facilidade de opt-out (`doNotContact`, documentada no rascunho gerado).
   - Sensibilidade dos dados coletados (nenhum dado sensível é coletado — ver
     lista de exclusões abaixo).
4. **Salvaguardas implementadas**: aprovação humana obrigatória antes de
   qualquer contato, exclusão sob pedido, retenção limitada (180 dias
   padrão), trilha de auditoria completa (`ProspectActivity`), mascaramento
   em logs.
5. **Assinatura/aprovação jurídica**: _____________________ (preencher antes
   de produção com provedor real).

## O que é coletado

- Nome profissional, cidade/estado, site, e-mail/telefone **publicados
  publicamente pelo próprio profissional** em canais profissionais.
- URL, título e snippet de resultados de busca (nunca o conteúdo integral
  das páginas do LinkedIn/PsyMeet).
- Trechos curtos de evidência textual de páginas de sites próprios
  (homepage/contato/agendamento apenas).

## O que nunca é coletado (garantido por código, não só por política)

`signal-detectors.ts` e `prospecting.service.ts` não têm nenhum caminho de
código que extraia ou armazene: orientação sexual, religião, saúde, origem
racial, opinião política, dados de pacientes, endereço residencial, CPF ou
informações familiares. Só extraímos e-mail/telefone via regex genérica de
contato profissional (`extractEmail`/`extractPhone` em `prospecting.service.ts`).

## Retenção e expiração

- `PROSPECTING_RETENTION_DAYS` (padrão 180 dias) define `retentionUntil` na
  descoberta de cada lead.
- O job `expireOldProspects` (só roda com `PROSPECTING_ENABLED=true`) expira
  automaticamente leads **não utilizados** (status ainda em `discovered`,
  `analyzing`, `analyzed`, `qualified` ou `error`) após o vencimento,
  removendo nome/e-mail/telefone/site e mantendo apenas um **hash SHA-256 do
  domínio** (`residualHash`) — suficiente para reconhecer o mesmo domínio no
  futuro sem guardar nenhum dado pessoal.
- Leads em uso ativo (`approved`, `contacted`, `replied`, `interested`,
  `registered`, `activated`) não são expirados automaticamente.

## Direitos do titular — endpoints administrativos

| Direito | Endpoint |
|---|---|
| Não ser mais contatado | `POST /admin/prospecting/prospects/:id/do-not-contact` |
| Exclusão dos dados | `DELETE /admin/prospecting/prospects/:id` |
| Exportação dos dados coletados sobre si | `GET /admin/prospecting/prospects/:id/export` |

Todos os endpoints exigem `JwtAuthGuard` + `AdminGuard` (allowlist de
e-mails via `ADMIN_EMAILS`) — nunca expostos publicamente. Se um psicólogo
solicitar diretamente (fora do painel), o administrador deve executar a
ação correspondente em nome dele.

## Auditoria

Toda mutação relevante (descoberta, merge de duplicata, análise, aprovação,
descarte, não-contatar, exclusão, exportação, geração de rascunho, expiração)
grava uma `ProspectActivity` com `actorUserId`, timestamp e notas — trilha
de auditoria completa e consultável via `GET /admin/prospecting/prospects/:id`.

## Mascaramento em logs

Os logs de observabilidade (`Logger` do NestJS) nunca registram e-mail ou
telefone completos, nem o conteúdo integral de páginas coletadas — apenas
contadores (`query_count`, `result_count`), status e domínios/paths curtos
(ver `maskUrl()` em `prospecting.service.ts`).
