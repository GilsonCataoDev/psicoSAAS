import {
  Controller, Post, Get, Delete, Param, Body, Req, Res, UseGuards, HttpCode,
} from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { IsEnum, IsString, IsNotEmpty } from 'class-validator'
import { Response } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { RequirePlan } from '../../common/decorators/require-plan.decorator'
import { PublicRoute } from '../../common/decorators/public-route.decorator'
import { AuditService } from '../audit/audit.service'
import { DocumentsService, CreateDocumentDto } from './documents.service'
import { DocType } from './entities/document.entity'

class CreateDocumentBodyDto implements CreateDocumentDto {
  @IsString() @IsNotEmpty() patientId: string
  @IsString() @IsNotEmpty() patientName: string
  @IsEnum(['declaracao','recibo','relatorio','atestado','encaminhamento']) type: DocType
  @IsString() @IsNotEmpty() title: string
  @IsString() @IsNotEmpty() content: string
}

@Controller('documents')
export class DocumentsController {
  constructor(
    private svc: DocumentsService,
    private audit: AuditService,
  ) {}

  /** Gerar e assinar um novo documento (requer plano Essencial ou superior) */
  @Post()
  @UseGuards(JwtAuthGuard, CsrfGuard)
  @RequirePlan('essencial')
  async create(@Req() req: any, @Body() body: CreateDocumentBodyDto) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
              ?? req.socket?.remoteAddress
    const doc = await this.svc.create(req.user, body, ip)
    await this.record(req, 'document.created', 'document', doc.id, { type: doc.type, patientId: doc.patientId })
    return doc
  }

  /** Listar meus documentos */
  @Get()
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  async findMine(@Req() req: any) {
    return this.svc.findByUser(req.user.id)
  }

  /** Excluir documento próprio */
  /** Gerar PDF do documento proprio, com QR e codigo de verificacao */
  @Get(':id/pdf')
  @UseGuards(JwtAuthGuard)
  async pdf(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const { filename, buffer } = await this.svc.generatePdf(id, req.user.id)
    await this.record(req, 'document.pdf_downloaded', 'document', id, { filename })
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'private, no-store',
    })
    res.end(buffer)
  }

  /** Enviar documento por email para o paciente (ou outro destinatário) */
  @Post(':id/send-email')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async sendEmail(@Param('id') id: string, @Body('to') to: string, @Req() req: any) {
    const result = await this.svc.sendDocumentByEmail(id, req.user.id, to)
    await this.record(req, 'document.email_sent', 'document', id, { to })
    return result
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async remove(@Param('id') id: string, @Req() req: any) {
    const result = await this.svc.remove(id, req.user.id)
    await this.record(req, 'document.deleted', 'document', id)
    return result
  }

  /**
   * Verificação pública — sem autenticação
   * Ex: GET /api/documents/verify/PS-2026-A1B2C3D4
   * Qualquer pessoa (paciente, instituição) pode verificar a autenticidade
   */
  @Get('verify/:code')
  @SkipThrottle()
  @PublicRoute()
  async verify(@Param('code') code: string) {
    return this.svc.verifyByCode(code.toUpperCase())
  }

  private record(req: any, action: string, resource: string, resourceId?: string, metadata?: Record<string, unknown>) {
    return this.audit.record({
      userId: req.user.id,
      action,
      resource,
      resourceId,
      metadata,
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    })
  }
}
