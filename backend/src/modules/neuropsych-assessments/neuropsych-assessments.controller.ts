import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { AuditService } from '../audit/audit.service'
import {
  CreateNeuropsychAssessmentDto, CreateNeuropsychBatteryItemDto,
  UpdateNeuropsychAssessmentDto, UpdateNeuropsychBatteryItemDto,
} from './dto/neuropsych-assessment.dto'
import { NeuropsychAssessmentsService } from './neuropsych-assessments.service'

@Controller('neuropsych-assessments')
@UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
export class NeuropsychAssessmentsController {
  constructor(private readonly service: NeuropsychAssessmentsService, private readonly audit: AuditService) {}

  @Get() list(@Req() req: any) { return this.service.list(req.user.id) }

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

  private record(req: any, action: string, resourceId: string, metadata?: Record<string, unknown>) {
    return this.audit.record({
      userId: req.user.id,
      action,
      resource: 'neuropsych_assessment',
      resourceId,
      metadata,
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    })
  }
}
