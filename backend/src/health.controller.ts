import { Controller, Get } from '@nestjs/common'
import { PublicRoute } from './common/decorators/public-route.decorator'

@PublicRoute()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'usecognia-api',
      timestamp: new Date().toISOString(),
    }
  }
}
