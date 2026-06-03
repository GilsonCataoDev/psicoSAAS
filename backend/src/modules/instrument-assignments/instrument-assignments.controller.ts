import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import { IsBoolean, IsOptional, IsString } from 'class-validator'
import { SkipThrottle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { PublicRoute } from '../../common/decorators/public-route.decorator'
import { RequirePlan } from '../../common/decorators/require-plan.decorator'
import { InstrumentAssignmentsService } from './instrument-assignments.service'

class CreateInstrumentAssignmentDto {
  @IsString() patientId: string
  @IsString() instrumentId: string
  @IsString() title: string
  @IsString() @IsOptional() description?: string
  @IsString() category: string
  @IsString() template: string
  @IsBoolean() @IsOptional() sendWhatsApp?: boolean
}

@Controller()
export class InstrumentAssignmentsController {
  constructor(private readonly svc: InstrumentAssignmentsService) {}

  @Get('instrument-assignments')
  @UseGuards(JwtAuthGuard)
  @RequirePlan('pro')
  findMine(@Req() req: any) {
    return this.svc.findMine(req.user.id)
  }

  @Post('instrument-assignments')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  @RequirePlan('pro')
  create(@Req() req: any, @Body() body: CreateInstrumentAssignmentDto) {
    return this.svc.create(body, req.user.id)
  }

  @Get('public/instruments/:token')
  @PublicRoute()
  @SkipThrottle()
  getPublic(@Param('token') token: string) {
    return this.svc.getPublic(token)
  }

  @Post('public/instruments/:token')
  @PublicRoute()
  @SkipThrottle()
  submit(@Param('token') token: string, @Body('answers') answers: Record<string, string>) {
    return this.svc.submit(token, answers ?? {})
  }
}
