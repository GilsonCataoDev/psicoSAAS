import {
  Controller, Post, Get, Delete, Param, Body, Req, Res, UseGuards, HttpCode, Query,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { IsEnum, IsString, IsNotEmpty, MaxLength } from 'class-validator'
import { Response } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { RequirePlan } from '../../common/decorators/require-plan.decorator'
import { PublicRoute } from '../../common/decorators/public-route.decorator'
import { AuditService } from '../audit/audit.service'
import { DocumentsService, CreateDocumentDto } from './documents.service'
import { DocType } from './entities/document.entity'
import { pdfAttachment } from '../../common/http/content-disposition.util'

class CreateDocumentBodyDto implements CreateDocumentDto {
  @IsString() @IsNotEmpty() @MaxLength(80) patientId: string
  @IsString() @IsNotEmpty() @MaxLength(120) patientName: string
  @IsEnum(['declaracao','recibo','relatorio','atestado','encaminhamento']) type: DocType
  @IsString() @IsNotEmpty() @MaxLength(160) title: string
  @IsString() @IsNotEmpty() @MaxLength(12000) content: string
}

@Controller('documents')
export class DocumentsController {
  constructor(
    private svc: DocumentsService,
    private audit: AuditService,
  ) {}

  /** Gerar e assinar um novo documento (requer plano Essencial ou superior) */
  @Post()
  @UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
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
  @UseGuards(JwtAuthGuard, NoImpersonationGuard)
  async findMine(@Req() req: any, @Query('type') type?: DocType) {
    return this.svc.findByUser(req.user.id, type)
  }

  /** Carrega o conteúdo somente quando o profissional abre um documento. */
  @Get(':id')
  @UseGuards(JwtAuthGuard, NoImpersonationGuard)
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.svc.findOneForUser(id, req.user.id)
  }

  /** Gerar PDF do documento proprio, com QR e codigo de verificacao */
  @Get(':id/pdf')
  @UseGuards(JwtAuthGuard, NoImpersonationGuard)
  async pdf(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const { filename, buffer } = await this.svc.generatePdf(id, req.user.id)
    await this.record(req, 'document.pdf_downloaded', 'document', id, { filename })
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': pdfAttachment(filename),
      'Content-Length': buffer.length,
      'Cache-Control': 'private, no-store',
    })
    res.end(buffer)
  }

  /** Enviar documento por email para o paciente (ou outro destinatário) */
  @Post(':id/send-email')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
  async sendEmail(@Param('id') id: string, @Body('to') to: string, @Req() req: any) {
    const result = await this.svc.sendDocumentByEmail(id, req.user.id, to)
    await this.record(req, 'document.email_sent', 'document', id, { to })
    return result
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
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
  @Throttle({ long: { limit: 30, ttl: 60 * 1000 } })
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
