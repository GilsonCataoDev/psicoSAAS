import {
  BadRequestException, Body, Controller, Delete, Get,
  Param, Patch, Post, Query, Request, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { SessionsService } from './sessions.service'
import { AiService } from './ai.service'
import { CreateSessionDto } from './dto/create-session.dto'

@Controller('sessions')
@UseGuards(JwtAuthGuard, CsrfGuard)
export class SessionsController {
  constructor(private svc: SessionsService, private ai: AiService) {}

  @Get() findAll(
    @Request() req: any,
    @Query('patientId') patientId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) { return this.svc.findAll(req.user.id, patientId, dateFrom, dateTo) }
  @Get('dashboard') dashboard(@Request() req: any) { return this.svc.getDashboard(req.user.id) }
  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.svc.findOne(id, req.user.id) }
  @Post() create(@Body() dto: CreateSessionDto, @Request() req: any) { return this.svc.create(dto, req.user.id) }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: Partial<CreateSessionDto>, @Request() req: any) { return this.svc.update(id, dto, req.user.id) }
  @Delete(':id') remove(@Param('id') id: string, @Request() req: any) { return this.svc.remove(id, req.user.id) }

  @Post('transcribe')
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async transcribe(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('Arquivo de áudio ausente')
    const text = await this.ai.transcribeAudio(file.buffer, file.mimetype)
    return { text }
  }

  @Post('ai-summary')
  @Throttle({ default: { limit: 20, ttl: 60 * 1000 } })
  async aiSummary(
    @Body('transcription') transcription: string,
    @Body('patientName') patientName?: string,
  ) {
    if (!transcription?.trim()) throw new BadRequestException('Transcrição ausente')
    const draft = await this.ai.generateSessionSummary(transcription, patientName)
    return { draft }
  }
}
