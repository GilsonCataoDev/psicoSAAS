import { Body, Controller, Delete, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { AvailabilityService } from './availability.service'
import {
  AvailabilityBlockDto,
  BlockedDateDto,
  ExtraAvailabilitySlotDto,
  SaveAvailabilitySlotsDto,
} from './dto/availability.dto'

@Controller('availability')
@UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
export class AvailabilityController {
  constructor(private svc: AvailabilityService) {}

  @Get()
  getSlots(@Request() req: any) { return this.svc.findAll(req.user.id) }

  @Get('smart-suggest')
  getSuggestedSlots(
    @Request() req: any,
    @Query('days') days?: string,
    @Query('sessionDuration') sessionDuration?: string,
    @Query('buffer') buffer?: string,
    @Query('modality') modality?: string,
    @Query('maxSlots') maxSlots?: string,
  ) {
    return this.svc.getSuggestedSlots(req.user.id, {
      days:            days            ? parseInt(days,            10) : undefined,
      sessionDuration: sessionDuration ? parseInt(sessionDuration, 10) : undefined,
      buffer:          buffer          ? parseInt(buffer,          10) : undefined,
      modality:        modality as 'presencial' | 'online' | undefined,
      maxSlots:        maxSlots        ? parseInt(maxSlots,        10) : undefined,
    })
  }

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

  @Get('blocks')
  getBlocks(@Request() req: any) { return this.svc.getAvailabilityBlocks(req.user.id) }

  @Post('blocks')
  addBlock(@Request() req: any, @Body() body: AvailabilityBlockDto) {
    return this.svc.addAvailabilityBlock(req.user.id, body)
  }

  @Delete('blocks/:id')
  removeBlock(@Param('id') id: string, @Request() req: any) {
    return this.svc.removeAvailabilityBlock(id, req.user.id)
  }
}
