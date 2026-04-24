import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import helmet from 'helmet'
import * as cookieParser from 'cookie-parser'

async function bootstrap() {
  // ── Validação de variáveis críticas na inicialização ───────────────────────
  const requiredEnv = ['JWT_SECRET', 'DATABASE_URL', 'SIGN_SECRET', 'ASAAS_API_KEY']
  for (const key of requiredEnv) {
    if (!process.env[key]) throw new Error(`Variável obrigatória ausente: ${key}`)
  }
  if ((process.env.JWT_SECRET ?? '').length < 32) {
    throw new Error('JWT_SECRET deve ter ao menos 32 caracteres')
  }
  if ((process.env.SIGN_SECRET ?? '').length < 32) {
    throw new Error('SIGN_SECRET deve ter ao menos 32 caracteres')
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
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
    .split(',').map(o => o.trim())

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true) // Postman / SSR
      if (allowedOrigins.includes(origin)) return cb(null, true)
      cb(new Error(`Origem bloqueada pelo CORS: ${origin}`))
    },
    credentials: true, // necessário para HttpOnly cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
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
