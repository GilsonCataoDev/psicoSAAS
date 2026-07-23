import { Controller, Get } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { PublicRoute } from './common/decorators/public-route.decorator'

@PublicRoute()
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  @Get()
  async check() {
    const database = await this.checkDatabase()
    return {
      status: database === 'ok' ? 'ok' : 'degraded',
      service: 'usecognia-api',
      timestamp: new Date().toISOString(),
      checks: { database },
    }
  }

  // Nunca retorna a mensagem do erro real (poderia vazar detalhes de conexão) —
  // só ok/error. Responde 200 mesmo em degraded para não disparar falsos
  // alarmes de infraestrutura em falhas transitórias de banco.
  private async checkDatabase(): Promise<'ok' | 'error'> {
    try {
      await this.ds.query('SELECT 1')
      return 'ok'
    } catch {
      return 'error'
    }
  }
}
