import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EmailService } from './email.service'
import { EmailLog } from './entities/email-log.entity'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([EmailLog])],
  providers: [EmailService],
  exports: [EmailService, TypeOrmModule],
})
export class EmailModule {}
