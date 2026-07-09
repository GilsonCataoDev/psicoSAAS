import { BadRequestException, Controller, ForbiddenException, Headers, Logger, Post } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Throttle } from '@nestjs/throttler'
import { PublicRoute } from '../../common/decorators/public-route.decorator'
import { AdminService } from './admin.service'

@PublicRoute()
@Controller('internal')
export class InternalCleanupController {
  private readonly logger = new Logger(InternalCleanupController.name)

  constructor(
    private readonly cfg: ConfigService,
    private readonly admin: AdminService,
  ) {}

  @Post('cleanup-test-users')
  @Throttle({ long: { limit: 3, ttl: 60 * 60 * 1000 } })
  async cleanupTestUsers(@Headers('x-internal-secret') secret: string | undefined) {
    const expected = this.cfg.get<string>('INTERNAL_CLEANUP_SECRET')
    if (!expected) throw new BadRequestException('INTERNAL_CLEANUP_SECRET não configurado')
    if (secret !== expected) throw new ForbiddenException('Secret inválido')

    const result = await this.admin.cleanupTestUsers()
    this.logger.log(`cleanup:test-users deletados=${result.deleted}`)
    return result
  }
}
