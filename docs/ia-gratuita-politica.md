# Política de provedores de IA gratuitos e dados clínicos

## Regra

**O tier gratuito do Google AI Studio (Gemini API gratuita) está proibido para qualquer dado clínico** — nomes, telefones, prontuários, transcrições de sessão, respostas de avaliações psicológicas, documentos ou qualquer conteúdo identificável de pacientes.

## Por quê

Os termos de uso do tier gratuito do Google AI Studio permitem que o Google utilize o conteúdo enviado para melhorar seus produtos (treinamento de modelo, revisão humana, etc.) — diferente do tier pago, que tem garantias contratuais de não uso dos dados para treinamento. Isso é incompatível com dados clínicos protegidos pela LGPD e pelo sigilo profissional da psicologia.

## Estado atual

Não existe nenhuma integração com Google AI Studio neste projeto. Os provedores de IA de texto atualmente em uso (Groq e Anthropic Claude, como fallback) foram avaliados separadamente e não têm essa restrição contratual da mesma forma — mas o princípio geral se aplica a qualquer provedor futuro: verificar os termos de uso antes de enviar dado clínico a qualquer API externa.

## Requisitos para suporte futuro a um provedor gratuito com essa cláusula

Se um dia fizer sentido usar Google AI Studio (ou outro provedor com termos semelhantes) para alguma tarefa não-crítica, isso só pode acontecer com **todos** os itens abaixo:

1. **Anonimização** — remoção de identificadores diretos (nome, telefone, e-mail, endereço) antes do envio, não apenas mascaramento superficial.
2. **Consentimento explícito** do paciente e/ou do psicólogo responsável, documentado.
3. **Feature flag dedicada**, desligada por padrão, exigindo configuração explícita para ativar (nunca "ligado por padrão" ou ativado silenciosamente por uma variável de ambiente genérica já existente).
4. **Configuração explícita** por instalação/tenant — não uma decisão global do sistema.

Nenhum identificador ou documento clínico pode ser enviado a um provedor gratuito sem essa cadeia completa de autorização.
