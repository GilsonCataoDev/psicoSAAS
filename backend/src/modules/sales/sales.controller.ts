import {
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { AdminGuard } from '../../common/guards/admin.guard'
import { PublicRoute } from '../../common/decorators/public-route.decorator'
import { SalesService } from './sales.service'
import { CreateSalesRepDto } from './dto/create-sales-rep.dto'
import { UpdateSalesRepDto } from './dto/update-sales-rep.dto'
import { MarkPaidDto } from './dto/mark-paid.dto'

@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @UseGuards(JwtAuthGuard, CsrfGuard, AdminGuard)
  @Get('reps')
  listReps() {
    return this.sales.listReps()
  }

  @UseGuards(JwtAuthGuard, CsrfGuard, AdminGuard)
  @Post('reps')
  createRep(@Body() dto: CreateSalesRepDto) {
    return this.sales.createRep(dto)
  }

  @UseGuards(JwtAuthGuard, CsrfGuard, AdminGuard)
  @Patch('reps/:id')
  updateRep(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalesRepDto,
  ) {
    return this.sales.updateRep(id, dto)
  }

  @UseGuards(JwtAuthGuard, CsrfGuard, AdminGuard)
  @Get('commissions')
  listCommissions(
    @Query('status') status?: string,
    @Query('salesRepId') salesRepId?: string,
  ) {
    return this.sales.adminListCommissions({ status, salesRepId })
  }

  @UseGuards(JwtAuthGuard, CsrfGuard, AdminGuard)
  @Post('commissions/:id/paid')
  markPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkPaidDto,
  ) {
    return this.sales.markPaid(id, dto.payoutReference)
  }

  @PublicRoute()
  @Get('portal/:token')
  @Header('Cache-Control', 'private, no-store')
  async getPortal(@Param('token') token: string) {
    const rep = await this.sales.getRepByToken(token)
    if (!rep) throw new NotFoundException('Link inválido ou expirado')
    const stats = await this.sales.getStats(rep.id)
    return {
      id: rep.id,
      name: rep.name,
      couponCode: rep.couponCode,
      status: rep.status,
      ...stats,
    }
  }
}
