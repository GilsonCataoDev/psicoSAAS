import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { RequireProfessionCapability } from '../../common/decorators/require-profession-capability.decorator'
import { AuditService } from '../audit/audit.service'
import { CreateNutritionPlanDto, UpdateNutritionPlanDto } from './dto/nutrition-plan.dto'
import { NutritionPlansService } from './nutrition-plans.service'

@Controller('nutrition-plans')
@UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
@RequireProfessionCapability('nutrition_plans')
export class NutritionPlansController {
  constructor(
    private readonly service: NutritionPlansService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(@Query('patientId', ParseUUIDPipe) patientId: string, @Req() req: any) {
    return this.service.list(patientId, req.user.id)
  }

  @Post()
  async create(@Body() body: CreateNutritionPlanDto, @Req() req: any) {
    const result = await this.service.create(body, req.user.id)
    await this.record(req, 'nutrition_plan.created', result.id, { patientId: result.patientId })
    return result
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateNutritionPlanDto,
    @Req() req: any,
  ) {
    const result = await this.service.update(id, body, req.user.id)
    await this.record(req, 'nutrition_plan.updated', id)
    return result
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const result = await this.service.remove(id, req.user.id)
    await this.record(req, 'nutrition_plan.deleted', id)
    return result
  }

  private record(req: any, action: string, resourceId: string, metadata?: Record<string, unknown>) {
    return this.audit.record({
      userId: req.user.id,
      action,
      resource: 'nutrition_plan',
      resourceId,
      metadata,
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    })
  }
}
