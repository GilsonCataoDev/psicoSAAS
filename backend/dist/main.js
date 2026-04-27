"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const helmet_1 = require("helmet");
const cookieParser = require("cookie-parser");
const Sentry = require("@sentry/node");
async function bootstrap() {
    const requiredEnv = ['JWT_SECRET', 'DATABASE_URL', 'SIGN_SECRET', 'ASAAS_API_KEY'];
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
    const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
        .split(',').map(o => o.trim());
    app.enableCors({
        origin: (origin, cb) => {
            if (!origin)
                return cb(null, true);
            if (allowedOrigins.includes(origin))
                return cb(null, true);
            cb(new Error(`Origem bloqueada pelo CORS: ${origin}`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
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