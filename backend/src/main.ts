// Polyfill crypto para Node 18
import { webcrypto } from 'crypto'
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto

// TypeORM 0.3.x + pg ≥ 8.12 disparam um DeprecationWarning sobre client.query()
// concurrent — é um bug interno do driver do TypeORM, não do nosso código.
// Suprimimos apenas este aviso específico; outros continuam visíveis.
process.on('warning', (w) => {
  if (w.name === 'DeprecationWarning' && w.message.includes('client.query()')) return
})

import { NestFactory } from '@nestjs/core'
import { Logger, ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import helmet from 'helmet'
import * as cookieParser from 'cookie-parser'
import * as Sentry from '@sentry/node'

async function bootstrap() {
  // ── Validação de variáveis críticas na inicialização ───────────────────────
  const requiredEnv = ['JWT_SECRET', 'DATABASE_URL', 'SIGN_SECRET', 'ENCRYPTION_KEY']
  for (const key of requiredEnv) {
    if (!process.env[key]) throw new Error(`Variável obrigatória ausente: ${key}`)
  }
  if ((process.env.JWT_SECRET ?? '').length < 32) {
    throw new Error('JWT_SECRET deve ter ao menos 32 caracteres')
  }
  if ((process.env.SIGN_SECRET ?? '').length < 32) {
    throw new Error('SIGN_SECRET deve ter ao menos 32 caracteres')
  }
  if ((process.env.ENCRYPTION_KEY ?? '').length < 32) {
    throw new Error('ENCRYPTION_KEY deve ter ao menos 32 caracteres')
  }

  // ── Sentry (erros em produção) ─────────────────────────────────────────────
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? 'development',
      tracesSampleRate: 0.1,   // 10% das transações
    })
  }

  const app = await NestFactory.create(AppModule)

  // ── Headers de segurança HTTP (Helmet) ─────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'"],
        styleSrc:    ["'self'", 'https://fonts.googleapis.com'],
        fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
        imgSrc:      ["'self'", 'data:'],
        connectSrc:  ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }))

  // ── Cookie parser (JWT em HttpOnly cookies) ─────────────────────────────────
  app.use(cookieParser())

  // ── CORS: whitelist explícita ───────────────────────────────────────────────
  const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, '')
  const defaultOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://gilsoncataodev.github.io',
    'http://usecognia.com.br',
    'http://www.usecognia.com.br',
    'https://usecognia.com.br',
    'https://www.usecognia.com.br',
    'https://usecognia.vercel.app',
  ]
  const allowedOrigins = Array.from(new Set([
    ...defaultOrigins,
    process.env.FRONTEND_URL,
    ...(process.env.ALLOWED_ORIGINS ?? '').split(','),
  ].filter(Boolean).map(origin => normalizeOrigin(origin as string))))

  const isProduction = process.env.NODE_ENV === 'production'
  const isLocalDevOrigin = (origin: string) =>
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)

  app.enableCors({
    origin: (origin, cb) => {
      // Requests sem Origin vêm de navegação direta, health checks, curl e Postman.
      // CORS só protege chamadas de browser com Origin, então não transforme isso em 500.
      if (!origin) {
        return cb(null, true)
      }
      if (allowedOrigins.includes(normalizeOrigin(origin))) return cb(null, true)
      if (!isProduction && isLocalDevOrigin(origin)) return cb(null, true)
      cb(new Error(`Origem bloqueada pelo CORS: ${origin}`))
    },
    credentials: true, // necessário para HttpOnly cookies cross-origin
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // X-CSRF-Token: cabeçalho customizado enviado em toda mutação pelo frontend
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  })

  // ── Validação e sanitização global de DTOs ─────────────────────────────────
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,           // remove campos não declarados no DTO
    transform: true,
    forbidNonWhitelisted: true, // erro se vier campo desconhecido
    stopAtFirstError: false,
  }))

  app.setGlobalPrefix('api')

  const port = process.env.PORT ?? 3001
  await app.listen(port)
  new Logger('Bootstrap').log(`UseCognia API rodando na porta ${port}`)
}
bootstrap()
