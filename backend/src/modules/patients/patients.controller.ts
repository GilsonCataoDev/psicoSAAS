import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, Res, UseGuards } from '@nestjs/common'
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
import { ExportProntuarioQueryDto } from './dto/export-prontuario.dto'

@Controller('patients')
@UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
export class PatientsController {
  constructor(
    private svc: PatientsService,
    private audit: AuditService,
  ) {}

  @Get() findAll(@Request() req: any) { return this.svc.findAll(req.user.id) }

  @Get(':id/prontuario/export')
  @Throttle({ long: { limit: 5, ttl: 60 * 60 * 1000 } })
  async exportProntuario(
    @Param('id') id: string,
    @Query() query: ExportProntuarioQueryDto,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const { filename, buffer } = await this.svc.exportProntuario(
      id,
      req.user.id,
      req.user.name,
      req.user.crp ?? '',
      query,
    )
    const patientCopy = query.audience === 'patient'
    await this.record(
      req,
      patientCopy ? 'patient.prontuario_patient_copy_exported' : 'patient.prontuario_exported',
      'patient',
      id,
      patientCopy ? { fromDate: query.fromDate, toDate: query.toDate, sections: query.sections } : undefined,
    )
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': pdfAttachment(filename),
      'Content-Length': buffer.length,
      'Cache-Control': 'private, no-store',
    })
    res.end(buffer)
  }

  // O guard de classe bloqueia toda a area de pacientes durante impersonacao.
  @Get(':id')
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
