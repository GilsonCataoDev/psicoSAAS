import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { TemplatesService } from './templates.service'
import { TemplateType } from './entities/template.entity'
import { CreateTemplateDto } from './dto/create-template.dto'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { AdminGuard } from '../../common/guards/admin.guard'

@Controller('templates')
@UseGuards(JwtAuthGuard, NoImpersonationGuard)
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  findAll(@Request() req: any, @Query('type') type?: TemplateType) {
    return this.templates.findAll(type, req.user?.profession)
  }

  @Get(':type')
  findByType(@Request() req: any, @Param('type') type: TemplateType) {
    return this.templates.findByType(type, req.user?.profession)
  }

  @Post()
  @UseGuards(JwtAuthGuard, CsrfGuard, AdminGuard)
  create(@Body() dto: CreateTemplateDto) {
    return this.templates.create(dto)
  }
}
