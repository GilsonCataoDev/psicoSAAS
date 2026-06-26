import { BadRequestException, Controller, ForbiddenException, Headers, Logger, Post } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Throttle } from '@nestjs/throttler'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { PublicRoute } from '../../common/decorators/public-route.decorator'

@PublicRoute()
@Controller('internal')
export class InternalCleanupController {
  private readonly logger = new Logger(InternalCleanupController.name)

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly cfg: ConfigService,
  ) {}

  @Post('cleanup-test-users')
  @Throttle({ long: { limit: 3, ttl: 60 * 60 * 1000 } })
  async cleanupTestUsers(@Headers('x-internal-secret') secret: string | undefined) {
    const expected = this.cfg.get<string>('INTERNAL_CLEANUP_SECRET')
    if (!expected) throw new BadRequestException('INTERNAL_CLEANUP_SECRET não configurado')
    if (secret !== expected) throw new ForbiddenException('Secret inválido')

    const targets: { id: string; email: string }[] = await this.ds.query(
      `SELECT id, email FROM users WHERE email LIKE '%@example.com' AND "createdAt" < NOW() - INTERVAL '1 hour'`,
    )
    if (targets.length === 0) return { deleted: 0 }

    const ids = targets.map(t => t.id)

    const fks: { table_name: string; column_name: string }[] = await this.ds.query(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'users'
        AND tc.table_name <> 'users'
    `)

    await this.ds.transaction(async tx => {
      for (const fk of fks) {
        await tx.query(`DELETE FROM "${fk.table_name}" WHERE "${fk.column_name}" = ANY($1::uuid[])`, [ids])
      }
      await tx.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [ids])
    })

    this.logger.log(`cleanup:test-users deletados=${targets.length}`)
    return { deleted: targets.length }
  }
}
