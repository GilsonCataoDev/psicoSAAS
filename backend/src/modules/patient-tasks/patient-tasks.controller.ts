import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PatientTasksService } from './patient-tasks.service'
import { CreatePatientTaskDto } from './dto/create-patient-task.dto'
import { UpdatePatientTaskDto } from './dto/update-patient-task.dto'

@UseGuards(JwtAuthGuard)
@Controller('patients/:patientId/tasks')
export class PatientTasksController {
  constructor(private svc: PatientTasksService) {}

  @Post()
  create(
    @Param('patientId') patientId: string,
    @Body() dto: CreatePatientTaskDto,
    @Request() req: any,
  ) {
    return this.svc.create(patientId, req.user.id, dto)
  }

  @Get()
  findAll(
    @Param('patientId') patientId: string,
    @Request() req: any,
  ) {
    return this.svc.findAll(patientId, req.user.id)
  }

  @Patch(':taskId')
  update(
    @Param('patientId') patientId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdatePatientTaskDto,
    @Request() req: any,
  ) {
    return this.svc.update(patientId, taskId, req.user.id, dto)
  }

  @Delete(':taskId')
  remove(
    @Param('patientId') patientId: string,
    @Param('taskId') taskId: string,
    @Request() req: any,
  ) {
    return this.svc.remove(patientId, taskId, req.user.id)
  }
}
