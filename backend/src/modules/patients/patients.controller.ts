import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PatientsService } from './patients.service'
import { CreatePatientDto } from './dto/create-patient.dto'
import { UpdatePatientDto } from './dto/update-patient.dto'

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private svc: PatientsService) {}

  @Get()    findAll(@Request() req: any) { return this.svc.findAll(req.user.id) }
  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.svc.findOne(id, req.user.id) }
  @Post()   create(@Body() dto: CreatePatientDto, @Request() req: any) { return this.svc.create(dto, req.user.id) }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePatientDto, @Request() req: any) { return this.svc.update(id, dto, req.user.id) }
  @Delete(':id') remove(@Param('id') id: string, @Request() req: any) { return this.svc.remove(id, req.user.id) }
}
