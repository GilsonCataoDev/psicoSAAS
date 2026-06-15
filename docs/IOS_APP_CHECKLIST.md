# UseCognia iOS

## Estado atual

- Projeto iOS Capacitor criado em `frontend/ios`.
- Bundle/app id base: `br.com.usecognia.app`.
- App usa o mesmo fluxo nativo de autenticacao via Bearer token e `@capacitor/preferences`.
- Backend ja aceita origem `capacitor://localhost`, usada pelo iOS.
- Permissoes iOS adicionadas para microfone, reconhecimento de fala, camera e fotos.
- Export compliance marcado como sem criptografia nao isenta, considerando uso padrao de HTTPS/TLS.

## O que da para manter no Windows

1. Alterar frontend React.
2. Rodar `npm run build`.
3. Rodar `npm run cap:sync:ios` para copiar assets e plugins para `frontend/ios`.
4. Commitar o projeto iOS e manter versionado.

## O que precisa de Mac

1. Instalar Xcode atualizado.
2. Abrir `frontend/ios/App/App.xcodeproj`.
3. Selecionar Team da Apple Developer.
4. Conferir bundle id `br.com.usecognia.app`.
5. Rodar em simulador iOS.
6. Rodar em iPhone real.
7. Validar login, persistencia de sessao, ditado/microfone, agenda, pacientes, prontuario, link publico e escolha de plano.
8. Gerar Archive no Xcode.
9. Enviar para TestFlight.

## Pendentes antes de App Store

- Conta Apple Developer ativa.
- Icones iOS finais em todos os tamanhos.
- Splash screen final.
- Screenshots iPhone 6.7", iPhone 6.5" e iPad, se publicar para iPad.
- Politica de privacidade e URLs de suporte preenchidas no App Store Connect.
- Decidir se o primeiro release iOS sai sem push nativo ou se integra APNs/Firebase antes do TestFlight publico.
