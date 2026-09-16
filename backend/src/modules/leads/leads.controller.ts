import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { PublicRoute } from '../../common/decorators/public-route.decorator'
import { LeadsService } from './leads.service'
import { CreateLeadDto } from './dto/create-lead.dto'

@Controller('leads')
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  @PublicRoute()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ short: { limit: 5, ttl: 60_000 } })
  async create(@Body() dto: CreateLeadDto) {
    const lead = await this.service.create(dto)
    return { id: lead.id, createdAt: lead.createdAt }
  }
}
