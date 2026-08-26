import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AskProductHelpDto } from './dto/ask-product-help.dto'
import { ProductHelpService } from './product-help.service'

@Controller('product-help')
@UseGuards(JwtAuthGuard, CsrfGuard)
export class ProductHelpController {
  constructor(private readonly productHelp: ProductHelpService) {}

  @Post('ask')
  @Throttle({ long: { limit: 15, ttl: 60_000 } })
  ask(@Body() dto: AskProductHelpDto) {
    return this.productHelp.ask(dto.question)
  }
}
