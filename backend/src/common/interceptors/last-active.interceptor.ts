import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { Observable } from 'rxjs'

@Injectable()
export class LastActiveInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LastActiveInterceptor.name)

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest()
    const userId: string | undefined = req.user?.id ?? req.user?.sub
    const lastActiveAt = req.user?.lastActiveAt
      ? new Date(req.user.lastActiveAt).getTime()
      : 0
    const shouldUpdate = Date.now() - lastActiveAt >= 15 * 60 * 1000

    if (userId && shouldUpdate) {
      // A estratégia JWT já carregou o usuário; evita consultar o banco em toda requisição.
      // O WHERE mantém a operação segura quando há requisições concorrentes ou mais de uma instância.
      this.ds
        .query(
          `UPDATE "users"
           SET "lastActiveAt" = NOW()
           WHERE "id" = $1
             AND ("lastActiveAt" IS NULL OR "lastActiveAt" < NOW() - INTERVAL '15 minutes')`,
          [userId],
        )
        .catch((err: unknown) => {
          this.logger.warn(
            `Falha ao atualizar lastActiveAt para userId=${userId}: ${(err as any)?.message ?? String(err)}`,
          )
        })
    }

    return next.handle()
  }
}
