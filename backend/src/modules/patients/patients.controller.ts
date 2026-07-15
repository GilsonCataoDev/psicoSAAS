import { Body, Controller, Delete, Get, Param, Patch, Post, Request, Res, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Response } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { PatientsService } from './patients.service'
import { CreatePatientDto } from './dto/create-patient.dto'
import { UpdatePatientDto } from './dto/update-patient.dto'
import { AuditService } from '../audit/audit.service'
import { pdfAttachment } from '../../common/http/content-disposition.util'

@Controller('patients')
@UseGuards(JwtAuthGuard, CsrfGuard)
export class PatientsController {
  constructor(
    private svc: PatientsService,
    private audit: AuditService,
  ) {}

  @Get() findAll(@Request() req: any) { return this.svc.findAll(req.user.id) }

  @Get(':id/prontuario/export')
  @UseGuards(JwtAuthGuard, NoImpersonationGuard)
  @Throttle({ long: { limit: 5, ttl: 60 * 60 * 1000 } })
  async exportProntuario(@Param('id') id: string, @Request() req: any, @Res() res: Response) {
    const { filename, buffer } = await this.svc.exportProntuario(
      id,
      req.user.id,
      req.user.name,
      req.user.crp ?? '',
    )
    await this.record(req, 'patient.prontuario_exported', 'patient', id)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': pdfAttachment(filename),
      'Content-Length': buffer.length,
      'Cache-Control': 'private, no-store',
    })
    res.end(buffer)
  }

  // Detalhe traz o prontuário (dado clínico) — bloqueado durante impersonação de admin.
  // A listagem (findAll) permanece acessível para suporte, pois não expõe conteúdo clínico.
  @Get(':id')
  @UseGuards(JwtAuthGuard, NoImpersonationGuard)
  async findOne(@Param('id') id: string, @Request() req: any) {
    const patient = await this.svc.findOne(id, req.user.id)
    await this.record(req, 'patient.viewed', 'patient', id)
    return patient
  }

  @Post()
  async create(@Body() dto: CreatePatientDto, @Request() req: any) {
    const patient = await this.svc.create(dto, req.user.id)
    await this.record(req, 'patient.created', 'patient', patient.id)
    return patient
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePatientDto, @Request() req: any) {
    const patient = await this.svc.update(id, dto, req.user.id)
    await this.record(req, 'patient.updated', 'patient', id, { fields: Object.keys(dto) })
    return patient
  }

  @Post(':id/portal-link')
  async createPortalLink(@Param('id') id: string, @Request() req: any) {
    const result = await this.svc.createPortalLink(id, req.user.id)
    await this.record(req, 'patient.portal_link_created', 'patient', id)
    return result
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const result = await this.svc.remove(id, req.user.id)
    await this.record(req, 'patient.deleted', 'patient', id)
    return result
  }

  private record(req: any, action: string, resource: string, resourceId?: string, metadata?: Record<string, unknown>) {
    return this.audit.record({
      userId: req.user.id,
      action,
      resource,
      resourceId,
      metadata,
      ip: this.getIp(req),
      userAgent: req.headers['user-agent'],
    })
  }

  private getIp(req: any): string | undefined {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? req.socket?.remoteAddress
  }
}
