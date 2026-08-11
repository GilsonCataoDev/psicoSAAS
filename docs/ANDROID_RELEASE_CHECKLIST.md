# Checklist de release Android (UseCognia)

Guia operacional pra gerar e publicar uma versão do app Android. Ver `docs/MOBILE_APP_ROADMAP.md` para o histórico/estado geral do app mobile.

## 1. Pré-requisitos (uma vez só)

### 1.1 Conta Google Play Console
[play.google.com/console](https://play.google.com/console) → taxa única de US$25 (cartão + conta Google).

### 1.2 Projeto Firebase (push notifications)
1. [console.firebase.google.com](https://console.firebase.google.com) → criar projeto (gratuito).
2. Adicionar app Android com `applicationId br.com.usecognia.app`.
3. Baixar o `google-services.json` gerado → colocar em `frontend/android/app/google-services.json` (já está no `.gitignore`, nunca commitar).
4. **Configurações do projeto → Contas de serviço → Gerar nova chave privada** → baixa um JSON. Minificar (uma linha só) e colar como `FIREBASE_SERVICE_ACCOUNT_JSON` nas variáveis de ambiente do backend (Railway).

### 1.3 Keystore de release
Precisa de um JDK instalado (`keytool` no PATH — vem com Android Studio ou um JDK avulso).

```bash
cd frontend/android
keytool -genkeypair -v -keystore usecognia-release.keystore -alias usecognia -keyalg RSA -keysize 2048 -validity 10000
cp keystore.properties.example keystore.properties
# edite keystore.properties com as senhas reais que você acabou de definir
```

**Faça backup do arquivo `usecognia-release.keystore` e das senhas num gerenciador de senhas AGORA.** Perder qualquer um dos dois significa nunca mais poder atualizar o app publicado — só dá pra publicar um app novo do zero, perdendo instalações/avaliações.

Nem o `.keystore` nem o `keystore.properties` são commitados (ver `.gitignore`).

## 2. Gerar uma nova versão

1. Atualize a versão em `frontend/package.json`: incremente `"version"` (ex: `0.1.0` → `0.2.0`) e `"androidVersionCode"` (sempre +1, é um inteiro que a Play Store usa pra saber que é mais recente que a anterior — nunca reduza nem repita).
2. Gere o bundle assinado:
   ```bash
   npm --prefix frontend run cap:build:android:release
   ```
   Saída: `frontend/android/app/build/outputs/bundle/release/app-release.aab`.
3. Teste antes de subir: instale um APK de debug equivalente (`npm run cap:build:android` + `npm run cap:install:android`) num aparelho físico Android real — tela pequena, teclado aberto, conexão instável, notificação push chegando.

## 3. Ficha da loja (Play Console)

- **Política de privacidade**: já existe, pública — `https://usecognia.com.br/privacidade`.
- **Descrição curta/longa**, **screenshots** (mínimo 2, do aparelho físico testado no passo 2.3), **ícone** (já gerado, `frontend/android/app/src/main/res/mipmap-*`).
- **Formulário de Data Safety**: declare os dados reais coletados — nome/e-mail/telefone do profissional, dados clínicos (criptografados, nunca vendidos/compartilhados — ver `docs/seguranca.md`). Revise pessoalmente antes de enviar; é uma declaração de compliance sua, não automática.
- **Classificação de conteúdo**: questionário padrão do Play Console (app de produtividade/saúde profissional, sem conteúdo sensível gerado por usuário público).

## 4. Upload e envio para revisão

Feito manualmente no Play Console (upload do `.aab`, preencher formulários, "Enviar para revisão") — precisa da sua conta, não é automatizável por aqui.

## 5. Atualizações futuras

Repita a seção 2 (nunca a 1) — o keystore e as contas são permanentes, só a versão muda a cada release.
