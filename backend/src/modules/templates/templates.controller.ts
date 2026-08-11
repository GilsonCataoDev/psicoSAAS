import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { TemplatesService } from './templates.service'
import { TemplateType } from './entities/template.entity'
import { CreateTemplateDto } from './dto/create-template.dto'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'

@Controller('templates')
@UseGuards(JwtAuthGuard, NoImpersonationGuard)
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  findAll(@Query('type') type?: TemplateType) {
    return this.templates.findAll(type)
  }

  @Get(':type')
  findByType(@Param('type') type: TemplateType) {
    return this.templates.findByType(type)
  }

  @Post()
  @UseGuards(JwtAuthGuard, CsrfGuard)
  create(@Body() dto: CreateTemplateDto) {
    return this.templates.create(dto)
  }
}
