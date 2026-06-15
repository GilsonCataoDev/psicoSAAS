# UseCognia Mobile

## Estado atual

- PWA instalavel com manifest, service worker, icones PNG/SVG e Apple touch icon.
- Atalhos do app apontando para rotas hash corretas: agenda e pacientes.
- Registro central do service worker com aviso de atualizacao.
- Configuracao inicial do Capacitor em `frontend/capacitor.config.ts`.
- Projeto Android criado em `frontend/android` e sincronizado com o build web.
- Backend preparado para aceitar origens de WebView nativo (`capacitor://localhost`, `ionic://localhost` e `https://localhost`).
- Android SDK command-line instalado localmente e APK debug gerado com sucesso.
- APK instalado e aberto no emulador `UseCognia_Test`; tela de login carregou corretamente.
- Persistencia de sessao no Android validada: login, fechamento forcado do app e reabertura mantendo usuario autenticado.
- App nativo usa tokens retornados apenas para clientes Capacitor e armazenados via Preferences nativo.
- Tela de notificacoes diferencia app nativo de Web Push/PWA para nao prometer push de loja antes da implementacao nativa.

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
6. Instalar e abrir no emulador/dispositivo conectado: `npm run cap:install:android`.
7. Abrir Android Studio: `npm run cap:open:android`.
8. Validar login, push, microfone, agenda e link publico.
9. Gerar iOS em um Mac: `npm run cap:add:ios`, `npm run cap:sync`, `npm run cap:open:ios`.
10. Criar contas Google Play e Apple Developer.
11. Preparar politica, screenshots, descricao e revisao das permissoes.

## Pontos de atencao antes da loja

- Em outra maquina, instalar Android Studio/SDK e configurar `ANDROID_HOME` ou `frontend/android/local.properties`.
- Confirmar em aparelho fisico Android a persistencia de login validada no emulador.
- Implementar notificacoes push nativas antes da loja; Web Push fica restrito ao navegador/PWA.
- Substituir icones PNG simples pelo logo final exportado em todos os tamanhos nativos.
- Rodar teste real em tela pequena, teclado aberto e conexao instavel.
