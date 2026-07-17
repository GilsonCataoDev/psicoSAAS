import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { AppointmentsService } from './appointments.service'
import { CreateAppointmentDto } from './dto/create-appointment.dto'
import { UpdateAppointmentDto } from './dto/update-appointment.dto'
import { UpdateGroupDto } from './dto/update-group.dto'
import { PosthogService } from '../posthog/posthog.service'

@Controller('appointments')
@UseGuards(JwtAuthGuard, CsrfGuard)
export class AppointmentsController {
  constructor(
    private svc: AppointmentsService,
    private posthog: PosthogService,
  ) {}

  // ── Grupo (devem vir antes das rotas com :id) ───────────────────────────────

  @Patch('group/:groupId/from/:fromDate')
  updateGroup(
    @Param('groupId') groupId: string,
    @Param('fromDate') fromDate: string,
    @Body() dto: UpdateGroupDto,
    @Request() req: any,
  ) {
    return this.svc.updateGroup(groupId, fromDate, dto, req.user.id)
  }

  @Delete('group/:groupId/from/:fromDate')
  removeGroup(
    @Param('groupId') groupId: string,
    @Param('fromDate') fromDate: string,
    @Request() req: any,
  ) {
    return this.svc.removeGroup(groupId, fromDate, req.user.id)
  }

  // ── Individual ─────────────────────────────────────────────────────────────

  @Get()
  findAll(
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.svc.findAll(req.user.id, from, to, patientId)
  }

  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.svc.findOne(id, req.user.id) }

  @Post() async create(@Body() dto: CreateAppointmentDto, @Request() req: any) {
    const result = await this.svc.create(dto, req.user.id)
    await this.posthog.captureAndFlush(this.posthog.distinctId(req.user.id), 'appointment_created', {
      modality: (dto as any).modality ?? undefined,
    })
    return result
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto, @Request() req: any) {
    return this.svc.update(id, dto, req.user.id)
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string, @Request() req: any) {
    return this.svc.updateStatus(id, status, req.user.id)
  }

  @Delete(':id') async remove(@Param('id') id: string, @Request() req: any) {
    const result = await this.svc.remove(id, req.user.id)
    await this.posthog.captureAndFlush(this.posthog.distinctId(req.user.id), 'appointment_deleted')
    return result
  }
}
