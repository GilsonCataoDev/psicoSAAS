import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { RequireProfessionCapability } from '../../common/decorators/require-profession-capability.decorator'
import { AuditService } from '../audit/audit.service'
import { CreateNutritionAssessmentDto } from './dto/nutrition-assessment.dto'
import { NutritionAssessmentsService } from './nutrition-assessments.service'

@Controller('nutrition-assessments')
@UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
@RequireProfessionCapability('nutrition_assessments')
export class NutritionAssessmentsController {
  constructor(private readonly service: NutritionAssessmentsService, private readonly audit: AuditService) {}

  @Get()
  list(@Query('patientId', ParseUUIDPipe) patientId: string, @Req() req: any) {
    return this.service.list(patientId, req.user.id)
  }

  @Post()
  async create(@Body() body: CreateNutritionAssessmentDto, @Req() req: any) {
    const result = await this.service.create(body, req.user.id)
    await this.record(req, 'nutrition_assessment.created', result.id, { patientId: result.patientId })
    return result
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const result = await this.service.remove(id, req.user.id)
    await this.record(req, 'nutrition_assessment.deleted', id)
    return result
  }

  private record(req: any, action: string, resourceId: string, metadata?: Record<string, unknown>) {
    return this.audit.record({
      userId: req.user.id,
      action,
      resource: 'nutrition_assessment',
      resourceId,
      metadata,
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    })
  }
}
