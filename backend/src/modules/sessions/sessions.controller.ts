import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { SessionsService } from './sessions.service'
import { CreateSessionDto } from './dto/create-session.dto'

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private svc: SessionsService) {}

  @Get() findAll(@Request() req: any, @Query('patientId') patientId?: string) { return this.svc.findAll(req.user.id, patientId) }
  @Get('dashboard') dashboard(@Request() req: any) { return this.svc.getDashboard(req.user.id) }
  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.svc.findOne(id, req.user.id) }
  @Post() create(@Body() dto: CreateSessionDto, @Request() req: any) { return this.svc.create(dto, req.user.id) }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: Partial<CreateSessionDto>, @Request() req: any) { return this.svc.update(id, dto, req.user.id) }
}
