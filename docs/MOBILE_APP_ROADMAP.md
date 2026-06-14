# UseCognia Mobile

## Estado atual

- PWA instalavel com manifest, service worker, icones PNG/SVG e Apple touch icon.
- Atalhos do app apontando para rotas hash corretas: agenda e pacientes.
- Registro central do service worker com aviso de atualizacao.
- Configuracao inicial do Capacitor em `frontend/capacitor.config.ts`.
- Projeto Android criado em `frontend/android` e sincronizado com o build web.
- Backend preparado para aceitar origens de WebView nativo (`capacitor://localhost` e `ionic://localhost`).
- Android SDK command-line instalado localmente e APK debug gerado com sucesso.

## Rota 1: PWA

1. Buildar o frontend: `npm run build`.
2. Publicar em HTTPS.
3. No Android, instalar pelo banner ou menu do Chrome.
4. No iOS, usar Compartilhar > Adicionar a Tela de Inicio.

## Rota 2: App de loja

1. Fechar QA mobile do PWA em Android e iPhone.
2. Gerar Android: `npm run cap:add:android`.
3. Sincronizar build: `npm run cap:sync`.
4. Gerar APK debug: `npm run cap:build:android`.
5. APK gerado em `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.
6. Abrir Android Studio: `npm run cap:open:android`.
7. Validar login, cookies, push, microfone, agenda e link publico.
8. Gerar iOS em um Mac: `npm run cap:add:ios`, `npm run cap:sync`, `npm run cap:open:ios`.
9. Criar contas Google Play e Apple Developer.
10. Preparar politica, screenshots, descricao e revisao das permissoes.

## Pontos de atencao antes da loja

- Em outra maquina, instalar Android Studio/SDK e configurar `ANDROID_HOME` ou `frontend/android/local.properties`.
- Confirmar persistencia de login dentro do WebView nativo.
- Confirmar notificacoes push nativas; Web Push pode nao cobrir todos os cenarios de loja.
- Substituir icones PNG simples pelo logo final exportado em todos os tamanhos nativos.
- Rodar teste real em tela pequena, teclado aberto e conexao instavel.
