import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../auth/entities/user.entity'
import { Document } from './entities/document.entity'
import { DocumentsService } from './documents.service'
import { DocumentsController } from './documents.controller'
import { EmailModule } from '../email/email.module'
import { AuditModule } from '../audit/audit.module'
import { SessionsModule } from '../sessions/sessions.module'

@Module({
  imports: [TypeOrmModule.forFeature([Document, User]), EmailModule, AuditModule, SessionsModule],
  providers: [DocumentsService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
