import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { AppointmentsService } from './appointments.service'
import { CreateAppointmentDto } from './dto/create-appointment.dto'
import { UpdateAppointmentDto } from './dto/update-appointment.dto'

@Controller('appointments')
@UseGuards(JwtAuthGuard, CsrfGuard)
export class AppointmentsController {
  constructor(private svc: AppointmentsService) {}

  @Get()
  findAll(@Request() req: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.findAll(req.user.id, from, to)
  }

  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.svc.findOne(id, req.user.id) }

  @Post() create(@Body() dto: CreateAppointmentDto, @Request() req: any) { return this.svc.create(dto, req.user.id) }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto, @Request() req: any) {
    return this.svc.update(id, dto, req.user.id)
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string, @Request() req: any) {
    return this.svc.updateStatus(id, status, req.user.id)
  }

  @Delete(':id') remove(@Param('id') id: string, @Request() req: any) { return this.svc.remove(id, req.user.id) }
}
