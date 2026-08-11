# Integração do CRM Conversacional no Admin

Guia de como usar o novo módulo de conversas no painel administrativo.

## 🎯 O que você pode fazer

- ✅ Criar conversas por canal (WhatsApp, Email, Instagram, Manual)
- ✅ Escrever e aprovar rascunhos de mensagens
- ✅ Enviar mensagens (Manual = copia pra você enviar manualmente)
- ✅ Registrar respostas recebidas
- ✅ Visualizar timeline completa de interações
- ✅ Pausar conversas ou marcar prospect como "não contatar"
- ✅ Converter prospect em cliente

## 📦 Componentes Disponíveis

### 1. `ProspectConversationsList`
Lista todas as conversas de um prospect com opção de criar novos canais.

```tsx
import { ProspectConversationsList } from '@/components/ProspectConversationsList'

<ProspectConversationsList
  prospectId="uuid-prospect"
  selectedConversationId={selected}
  onSelectConversation={setSelected}
/>
```

### 2. `ProspectingConversation`
Interface completa para gerenciar uma conversa individual.

```tsx
import { ProspectingConversation } from '@/components/ProspectingConversation'

<ProspectingConversation conversationId="uuid-conversa" />
```

### 3. `ProspectDetailWithConversations`
Modal/painel pronto com lista de conversas + detalhe em um só lugar.

```tsx
import { ProspectDetailWithConversations } from '@/components/ProspectDetailWithConversations'

<ProspectDetailWithConversations
  prospectId={prospectId}
  prospectName="João Silva"
  onClose={() => setOpen(false)}
/>
```

## 🔧 Como Integrar na ProspectingPage

No arquivo `frontend/src/pages/admin/ProspectingPage.tsx`:

```tsx
import { useState } from 'react'
import { ProspectDetailWithConversations } from '@/components/ProspectDetailWithConversations'

export function ProspectingPage() {
  const [selectedProspectId, setSelectedProspectId] = useState<string>()

  return (
    <>
      {/* Seu código existente de lista de prospects */}

      {/* Modal de detalhe com conversas */}
      {selectedProspectId && (
        <ProspectDetailWithConversations
          prospectId={selectedProspectId}
          prospectName={/* nome do prospect */}
          onClose={() => setSelectedProspectId(undefined)}
        />
      )}
    </>
  )
}
```

## 🎮 Fluxo Typical

### Admin quer contatar um prospect

1. **Abre detalhe** do prospect
2. **Clica em "Nova Conversa"** → seleciona canal (Manual)
3. **Escreve rascunho** da mensagem
4. **Aprova** (verifica se está tudo certo)
5. **Envia** (Manual = sistema registra + admin copia pra WhatsApp/email)
6. **Espera resposta**
7. **Registra resposta manual** (cola o que recebeu)
8. **Sistema classifica** automaticamente (interested, opt_out, etc)
9. **Se opt-out** → sistema bloqueia tudo
10. **Se interested** → pode criar follow-ups

## 🧪 Hooks de API Disponíveis

```tsx
import {
  useProspectConversations,      // Lista conversas
  useConversation,               // Detalhe + timeline
  useCreateConversation,         // Cria conversa
  useCreateDraftMessage,         // Rascunho
  useApproveMessage,             // Aprova
  useSendMessage,                // Envia
  useRecordInbound,              // Registra resposta
  usePauseConversation,          // Pausa
  useOptOutConversation,         // Não contatar
  useConvertConversation,        // Convertido
} from '@/hooks/api/prospecting-conversations'
```

## 📊 Exemplo Completo

```tsx
import { useState } from 'react'
import { ProspectingConversation } from '@/components/ProspectingConversation'
import { ProspectConversationsList } from '@/components/ProspectConversationsList'

export function MyProspectDetail() {
  const [conversationId, setConversationId] = useState<string>()

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Lista de conversas */}
      <div>
        <ProspectConversationsList
          prospectId="prospect-uuid"
          selectedConversationId={conversationId}
          onSelectConversation={setConversationId}
        />
      </div>

      {/* Detalhe da conversa selecionada */}
      <div className="col-span-2">
        {conversationId ? (
          <ProspectingConversation conversationId={conversationId} />
        ) : (
          <p className="text-neutral-500">Selecione uma conversa</p>
        )}
      </div>
    </div>
  )
}
```

## 🔐 Segurança

- ✅ Apenas admins podem acessar (`AdminGuard`)
- ✅ Aprovação obrigatória antes de enviar
- ✅ Opt-out imediato bloqueia tudo
- ✅ Webhook autenticado por bearer token
- ✅ Nenhum envio automático sem aprovação

## 📝 Notas

- **Manual channel**: Sistema apenas registra. Admin copia a mensagem e envia manualmente via WhatsApp/Email.
- **Mock mode**: Para testes. Simula envios sem de verdade.
- **Follow-ups**: Desabilitados por padrão. Requer `PROSPECTING_OUTREACH_ENABLED=true`.
- **Webhook**: Para integrações futuras com Evolution API ou similar.

## 🚀 Deploy

Após merge em `main`:

```bash
# Backend já está pronto
npm run build          # Verifica
npm test              # Testa

# Frontend
cd frontend
npm run build         # Compila
```

Tudo está pronto para produção após:
1. ✅ PostgreSQL configurado
2. ✅ JWT_SECRET em .env
3. ✅ Revisão jurídica do LIA (antes de habilitar automação)
