// Executado pelo Jest via `setupFiles`, ANTES de qualquer import de módulo do
// app (inclusive AppModule) — é o único jeito confiável de garantir que
// ConfigService/process.env já estejam preenchidos quando os providers forem
// construídos. Valores dummy: nenhum destes serviços deve ser chamado de
// verdade nos testes de integração (Asaas, e-mail, etc. não são exercitados).
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgres://test:test@localhost:5433/usecognia_test'
process.env.TYPEORM_SYNC = 'true'
process.env.TYPEORM_DROP_SCHEMA = 'true'
process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters'
process.env.SIGN_SECRET = 'test-sign-secret-with-at-least-32-characters'
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters!!'
process.env.ASAAS_WEBHOOK_TOKEN = 'test-asaas-webhook-token'
process.env.ASAAS_API_KEY = 'test-asaas-api-key'
process.env.WHATSAPP_API_URL = 'https://evolution.test'
process.env.WHATSAPP_API_KEY = 'test-whatsapp-api-key'
process.env.WHATSAPP_INSTANCE_PREFIX = 'integration'
