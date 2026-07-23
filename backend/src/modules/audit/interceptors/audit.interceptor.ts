import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { AUDITABLE_KEY, AuditableOptions } from '../decorators/auditable.decorator'
import { AuditService } from '../audit.service'

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<AuditableOptions | undefined>(
      AUDITABLE_KEY,
      context.getHandler(),
    )

    if (!options) return next.handle()

    return next.handle().pipe(
      tap({
        next: (result) => this.logAudit(context, options, result),
        // Não audita erros — a mutação não ocorreu
      }),
    )
  }

  private logAudit(
    context: ExecutionContext,
    options: AuditableOptions,
    result: unknown,
  ): void {
    const req = context.switchToHttp().getRequest<any>()
    const userId = req.user?.id ?? 'anonymous'
    const ip     = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? req.socket?.remoteAddress

    const resourceId = this.resolveResourceId(context, options, result)

    this.auditService.record({
      userId,
      action:     options.action,
      resource:   options.resource,
      resourceId: resourceId ?? undefined,
      ip,
      userAgent:  req.headers['user-agent'],
    }).catch(() => { /* falha de auditoria não propaga para o caller */ })
  }

  private resolveResourceId(
    context: ExecutionContext,
    options: AuditableOptions,
    result: unknown,
  ): string | null {
    // 1. Tenta extrair do resultado (ex: o objeto criado)
    if (options.resultIdKey && result && typeof result === 'object') {
      const val = (result as Record<string, unknown>)[options.resultIdKey]
      if (typeof val === 'string') return val
    }
    // 2. Tenta extrair do parâmetro da rota (ex: :id em DELETE /:id)
    if (options.paramIdKey) {
      const req = context.switchToHttp().getRequest<any>()
      const val = req.params?.[options.paramIdKey]
      if (typeof val === 'string') return val
    }
    return null
  }
}
