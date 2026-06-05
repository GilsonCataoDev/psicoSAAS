import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { TemplatesService } from './templates.service'
import { TemplateType } from './entities/template.entity'
import { CreateTemplateDto } from './dto/create-template.dto'

@Controller('templates')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
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
