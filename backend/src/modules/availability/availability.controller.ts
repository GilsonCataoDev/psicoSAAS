import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { AvailabilityService } from './availability.service'
import {
  BlockedDateDto,
  ExtraAvailabilitySlotDto,
  SaveAvailabilitySlotsDto,
} from './dto/availability.dto'

@Controller('availability')
@UseGuards(JwtAuthGuard, CsrfGuard)
export class AvailabilityController {
  constructor(private svc: AvailabilityService) {}

  @Get()
  getSlots(@Request() req: any) { return this.svc.findAll(req.user.id) }

  @Post('slots')
  saveSlots(@Request() req: any, @Body() body: SaveAvailabilitySlotsDto) {
    return this.svc.saveSlots(req.user.id, body.slots)
  }

  @Get('extra')
  getExtraSlots(@Request() req: any) { return this.svc.getExtraSlots(req.user.id) }

  @Post('extra')
  addExtraSlot(@Request() req: any, @Body() body: ExtraAvailabilitySlotDto) {
    return this.svc.addExtraSlot(req.user.id, body)
  }

  @Delete('extra/:id')
  removeExtraSlot(@Param('id') id: string, @Request() req: any) {
    return this.svc.removeExtraSlot(id, req.user.id)
  }

  @Get('blocked')
  getBlocked(@Request() req: any) { return this.svc.getBlockedDates(req.user.id) }

  @Post('blocked')
  addBlocked(@Request() req: any, @Body() body: BlockedDateDto) {
    return this.svc.addBlockedDate(req.user.id, body.date, body.reason)
  }

  @Post('blocked/week')
  addBlockedWeek(@Request() req: any, @Body() body: BlockedDateDto) {
    return this.svc.addBlockedWeek(req.user.id, body.date, body.reason)
  }

  @Delete('blocked/:id')
  removeBlocked(@Param('id') id: string, @Request() req: any) {
    return this.svc.removeBlockedDate(id, req.user.id)
  }
}
