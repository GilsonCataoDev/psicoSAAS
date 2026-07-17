import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable, throwError } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { PosthogService } from '../../modules/posthog/posthog.service'

@Injectable()
export class PosthogExceptionInterceptor implements NestInterceptor {
  constructor(private readonly posthog: PosthogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const status = error instanceof HttpException ? error.getStatus() : 500
        if (status >= 500) {
          const req = context.switchToHttp().getRequest<any>()
          const distinctId = req?.user?.id
            ? this.posthog.distinctId(req.user.id)
            : 'anonymous'
          this.posthog.captureException(error, distinctId)
          this.posthog.client.flush().catch(() => {})
        }
        return throwError(() => error)
      }),
    )
  }
}
