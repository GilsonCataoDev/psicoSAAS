import {
  BadRequestException, Controller, Post, Get, Delete, Param, Body, Req, Res, UseGuards, HttpCode, Query,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { IsEnum, IsIn, IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator'
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
import { AiDocumentField, AiDocumentType, AiService } from '../sessions/ai.service'
import { AiTextQuotaService } from '../sessions/ai-text-quota.service'
import { SendDocumentEmailDto } from './dto/send-document-email.dto'

class CreateDocumentBodyDto implements CreateDocumentDto {
  @IsString() @IsNotEmpty() @MaxLength(80) patientId: string
  @IsString() @IsNotEmpty() @MaxLength(120) patientName: string
  @IsEnum(['declaracao','recibo','relatorio','atestado','encaminhamento']) type: DocType
  @IsString() @IsNotEmpty() @MaxLength(160) title: string
  @IsString() @IsNotEmpty() @MaxLength(12000) content: string
}

class GenerateDocumentAiDraftDto {
  @IsIn(['relatorio', 'atestado', 'encaminhamento']) documentType: AiDocumentType
  @IsIn(['demand', 'procedure', 'analysis', 'conclusion', 'referralReason']) field: AiDocumentField
  @IsString() @IsNotEmpty() @MinLength(20) @MaxLength(8000) input: string
}

const DOCUMENT_AI_FIELDS: Record<AiDocumentType, AiDocumentField[]> = {
  relatorio: ['demand', 'procedure', 'analysis', 'conclusion'],
  atestado: ['demand', 'procedure', 'conclusion'],
  encaminhamento: ['referralReason'],
}

@Controller('documents')
export class DocumentsController {
  constructor(
    private svc: DocumentsService,
    private audit: AuditService,
    private readonly ai: AiService,
    private readonly aiTextQuota: AiTextQuotaService,
  ) {}

  /** Gerar e assinar um novo documento (requer plano Pro ou superior) */
  @Post()
  @UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
  @RequirePlan('pro')
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

  /** Organiza um campo do documento sem salvar nem assinar automaticamente. */
  @Post('ai-draft')
  @UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
  @RequirePlan('pro')
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  async generateAiDraft(@Req() req: any, @Body() body: GenerateDocumentAiDraftDto) {
    if (!DOCUMENT_AI_FIELDS[body.documentType].includes(body.field)) {
      throw new BadRequestException('Este campo não é compatível com o tipo de documento selecionado.')
    }

    await this.aiTextQuota.reserve(req.user.id, req.user.email)
    let result
    try {
      result = await this.ai.generateDocumentDraft(body.input, body.documentType, body.field)
    } catch (error) {
      await this.aiTextQuota.release(req.user.id).catch(() => {})
      throw error
    }
    await this.aiTextQuota.recordUsage(req.user.id, result.usage)
    await this.record(req, 'document.ai_draft_generated', 'document_ai_draft', undefined, {
      documentType: body.documentType,
      field: body.field,
    })
    return { draft: result.text }
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
  async sendEmail(@Param('id') id: string, @Body() body: SendDocumentEmailDto, @Req() req: any) {
    const result = await this.svc.sendDocumentByEmail(id, req.user.id, body.to)
    await this.record(req, 'document.email_sent', 'document', id, { to: body.to })
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
