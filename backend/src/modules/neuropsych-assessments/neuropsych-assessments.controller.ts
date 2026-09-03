import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Response } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { RequirePlan } from '../../common/decorators/require-plan.decorator'
import { AuditService } from '../audit/audit.service'
import { pdfAttachment } from '../../common/http/content-disposition.util'
import {
  CreateNeuropsychAiAnalysisDto,
  CreateNeuropsychAssessmentDto, CreateNeuropsychBatteryItemDto,
  ListNeuropsychAssessmentsQueryDto,
  UpdateNeuropsychAssessmentDto, UpdateNeuropsychBatteryItemDto,
} from './dto/neuropsych-assessment.dto'
import { NeuropsychAssessmentsService } from './neuropsych-assessments.service'
import { NeuropsychAiAnalysisService } from './neuropsych-ai-analysis.service'
import { AiConsentService } from '../ai-governance/ai-consent.service'

@Controller('neuropsych-assessments')
@UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
@RequirePlan('pro')
export class NeuropsychAssessmentsController {
  constructor(
    private readonly service: NeuropsychAssessmentsService,
    private readonly aiAnalysis: NeuropsychAiAnalysisService,
    private readonly audit: AuditService,
    private readonly aiConsents: AiConsentService,
  ) {}

  @Get() list(@Query() query: ListNeuropsychAssessmentsQueryDto, @Req() req: any) {
    return this.service.list(req.user.id, query)
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const result = await this.service.findOne(id, req.user.id)
    await this.record(req, 'neuropsych_assessment.viewed', id)
    return result
  }

  @Post()
  async create(@Body() body: CreateNeuropsychAssessmentDto, @Req() req: any) {
    const result = await this.service.create(body, req.user.id)
    await this.record(req, 'neuropsych_assessment.created', result.id, { patientId: result.patientId })
    return result
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateNeuropsychAssessmentDto, @Req() req: any) {
    const result = await this.service.update(id, body, req.user.id)
    await this.record(req, 'neuropsych_assessment.updated', id, { fields: Object.keys(body) })
    return result
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const result = await this.service.remove(id, req.user.id)
    await this.record(req, 'neuropsych_assessment.deleted', id)
    return result
  }

  @Post(':id/battery-items')
  async addItem(@Param('id', ParseUUIDPipe) id: string, @Body() body: CreateNeuropsychBatteryItemDto, @Req() req: any) {
    const result = await this.service.addItem(id, body, req.user.id)
    await this.record(req, 'neuropsych_assessment.battery_item_created', id, { itemId: result.id })
    return result
  }

  @Patch(':id/battery-items/:itemId')
  async updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() body: UpdateNeuropsychBatteryItemDto,
    @Req() req: any,
  ) {
    const result = await this.service.updateItem(id, itemId, body, req.user.id)
    await this.record(req, 'neuropsych_assessment.battery_item_updated', id, { itemId, fields: Object.keys(body) })
    return result
  }

  @Delete(':id/battery-items/:itemId')
  async removeItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Req() req: any,
  ) {
    const result = await this.service.removeItem(id, itemId, req.user.id)
    await this.record(req, 'neuropsych_assessment.battery_item_deleted', id, { itemId })
    return result
  }

  @Get(':id/export')
  @Throttle({ long: { limit: 5, ttl: 60 * 60 * 1000 } })
  async exportPdf(@Param('id', ParseUUIDPipe) id: string, @Req() req: any, @Res() res: Response) {
    const { filename, stream } = await this.service.exportPdf(id, req.user.id, req.user.name, req.user.crp ?? '')
    await this.record(req, 'neuropsych_assessment.exported', id)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': pdfAttachment(filename),
      'Cache-Control': 'private, no-store',
    })
    stream.on('error', () => {
      if (!res.headersSent) res.status(500)
      res.end()
    })
    stream.pipe(res)
    stream.end()
  }

  @Post(':id/share')
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  async createShareLink(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const result = await this.service.createShareLink(id, req.user.id)
    await this.record(req, 'neuropsych_assessment.share_link_created', id)
    return result
  }

  @Delete(':id/share')
  async revokeShareLink(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const result = await this.service.revokeShareLink(id, req.user.id)
    await this.record(req, 'neuropsych_assessment.share_link_revoked', id)
    return result
  }

  @Get(':id/ai-usage')
  @RequirePlan('pro')
  getAiUsage(@Req() req: any) {
    return this.aiAnalysis.getUsage(req.user.id, req.user.email)
  }

  @Get(':id/ai-analysis')
  @RequirePlan('pro')
  listAiAnalyses(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.aiAnalysis.list(id, req.user.id)
  }

  @Post(':id/ai-analysis')
  @RequirePlan('pro')
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  async generateAiAnalysis(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateNeuropsychAiAnalysisDto,
    @Req() req: any,
  ) {
    await this.aiConsents.assertActive(req.user.id, 'neuropsych_ai')
    const result = await this.aiAnalysis.generate(id, body.fields, req.user.id, req.user.email)
    await this.record(req, 'neuropsych_ai_analysis.requested', id, { fields: body.fields }, 'neuropsych_ai_analysis')
    return result
  }

  @Delete(':id/ai-analysis/:analysisId')
  @RequirePlan('pro')
  async deleteAiAnalysis(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('analysisId', ParseUUIDPipe) analysisId: string,
    @Req() req: any,
  ) {
    const result = await this.aiAnalysis.remove(id, analysisId, req.user.id)
    await this.record(req, 'neuropsych_ai_analysis.deleted', id, { analysisId }, 'neuropsych_ai_analysis')
    return result
  }

  private record(
    req: any,
    action: string,
    resourceId: string,
    metadata?: Record<string, unknown>,
    resource: string = 'neuropsych_assessment',
  ) {
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
