import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Document } from './entities/document.entity'
import { DocumentsService } from './documents.service'
import { DocumentsController } from './documents.controller'
import { Subscription } from '../billing/entities/subscription.entity'
import { EmailModule } from '../email/email.module'

@Module({
  imports: [TypeOrmModule.forFeature([Document, Subscription]), EmailModule],
  providers: [DocumentsService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
