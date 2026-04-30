"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
if (!globalThis.crypto)
    globalThis.crypto = crypto_1.webcrypto;
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const helmet_1 = require("helmet");
const cookieParser = require("cookie-parser");
const Sentry = require("@sentry/node");
async function bootstrap() {
    const requiredEnv = ['JWT_SECRET', 'DATABASE_URL', 'SIGN_SECRET', 'ENCRYPTION_KEY'];
    for (const key of requiredEnv) {
        if (!process.env[key])
            throw new Error(`Variável obrigatória ausente: ${key}`);
    }
    if ((process.env.JWT_SECRET ?? '').length < 32) {
        throw new Error('JWT_SECRET deve ter ao menos 32 caracteres');
    }
    if ((process.env.SIGN_SECRET ?? '').length < 32) {
        throw new Error('SIGN_SECRET deve ter ao menos 32 caracteres');
    }
    if ((process.env.ENCRYPTION_KEY ?? '').length < 32) {
        throw new Error('ENCRYPTION_KEY deve ter ao menos 32 caracteres');
    }
    if (process.env.SENTRY_DSN) {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            environment: process.env.NODE_ENV ?? 'development',
            tracesSampleRate: 0.1,
        });
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", 'https://fonts.googleapis.com'],
                fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                imgSrc: ["'self'", 'data:'],
                connectSrc: ["'self'"],
            },
        },
        crossOriginEmbedderPolicy: false,
    }));
    app.use(cookieParser());
    const allowedOrigins = (process.env.ALLOWED_ORIGINS ??
        'http://localhost:3000,http://localhost:5173,https://gilsoncataodev.github.io').split(',').map(o => o.trim());
    const isProduction = process.env.NODE_ENV === 'production';
    app.enableCors({
        origin: (origin, cb) => {
            if (!origin) {
                if (isProduction)
                    return cb(new Error('Requisição sem Origin bloqueada em produção'));
                return cb(null, true);
            }
            if (allowedOrigins.includes(origin))
                return cb(null, true);
            cb(new Error(`Origem bloqueada pelo CORS: ${origin}`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        stopAtFirstError: false,
    }));
    app.setGlobalPrefix('api');
    const port = process.env.PORT ?? 3001;
    await app.listen(port);
    console.log(`PsicoSaaS API rodando na porta ${port} 🌱`);
}
bootstrap();
//# sourceMappingURL=main.js.map