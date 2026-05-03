import {
  Controller, Post, Get, Delete, Param, Body, Req, Res, UseGuards,
} from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { IsEnum, IsString, IsNotEmpty } from 'class-validator'
import { Response } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RequirePlan } from '../../common/decorators/require-plan.decorator'
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
  constructor(private svc: DocumentsService) {}

  /** Gerar e assinar um novo documento (requer plano Essencial ou superior) */
  @Post()
  @UseGuards(JwtAuthGuard)
  @RequirePlan('essencial')
  async create(@Req() req: any, @Body() body: CreateDocumentBodyDto) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
              ?? req.socket?.remoteAddress
    return this.svc.create(req.user, body, ip)
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
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'private, no-store',
    })
    res.end(buffer)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.svc.remove(id, req.user.id)
  }

  /**
   * Verificação pública — sem autenticação
   * Ex: GET /api/documents/verify/PS-2026-A1B2C3D4
   * Qualquer pessoa (paciente, instituição) pode verificar a autenticidade
   */
  @Get('verify/:code')
  @SkipThrottle()
  async verify(@Param('code') code: string) {
    return this.svc.verifyByCode(code.toUpperCase())
  }
}
