import {
  Body, Controller, Get, Param, ParseUUIDPipe,
  Patch, Post, Req, UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { AdminGuard } from '../../common/guards/admin.guard'
import { TestimonialService } from './testimonial.service'
import { CreateTestimonialDto } from './dto/create-testimonial.dto'
import { UpdateTestimonialApprovalDto } from './dto/update-testimonial-approval.dto'

@Controller('feedback')
export class TestimonialController {
  constructor(private readonly service: TestimonialService) {}

  @UseGuards(JwtAuthGuard)
  @Get('status')
  getStatus(@Req() req: any) {
    return this.service.getStatus(req.user.id)
  }

  @UseGuards(JwtAuthGuard, CsrfGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateTestimonialDto) {
    return this.service.create(req.user.id, dto)
  }

  @UseGuards(JwtAuthGuard, CsrfGuard, AdminGuard)
  @Get('admin/testimonials')
  listAdmin() {
    return this.service.listAdmin()
  }

  @UseGuards(JwtAuthGuard, CsrfGuard, AdminGuard)
  @Patch('admin/testimonials/:id')
  setApproved(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTestimonialApprovalDto,
  ) {
    return this.service.setApproved(id, body.approvedForPublic)
  }
}
