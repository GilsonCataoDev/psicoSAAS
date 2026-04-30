// Polyfill crypto for Node 18 compatibility
import { webcrypto } from 'crypto'
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto

import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
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
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ??
    'http://localhost:3000,http://localhost:5173,https://gilsoncataodev.github.io'
  ).split(',').map(o => o.trim())

  const isProduction = process.env.NODE_ENV === 'production'

  app.enableCors({
    origin: (origin, cb) => {
      // Em produção: exige origem conhecida. Em dev: permite sem origem (Postman, curl)
      if (!origin) {
        if (isProduction) return cb(new Error('Requisição sem Origin bloqueada em produção'))
        return cb(null, true)
      }
      if (allowedOrigins.includes(origin)) return cb(null, true)
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
  console.log(`PsicoSaaS API rodando na porta ${port} 🌱`)
}
bootstrap()
