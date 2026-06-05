import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TemplatesService } from './templates.service'
import { TemplateType } from './entities/template.entity'

@Controller('templates')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  findAll(@Query('type') type?: TemplateType) {
    return this.templates.findAll(type)
  }
}
