import { Module, Global } from '@nestjs/common'
import { EmailService } from './email.service'

@Global()  // disponível em todos os módulos sem re-importar
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
