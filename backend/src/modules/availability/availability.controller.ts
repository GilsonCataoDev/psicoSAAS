import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AvailabilityService } from './availability.service'

@Controller('availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private svc: AvailabilityService) {}

  @Get()
  getSlots(@Request() req: any) { return this.svc.findAll(req.user.id) }

  @Post('slots')
  saveSlots(@Request() req: any, @Body() body: { slots: { weekday: number; startTime: string; endTime: string; modality?: 'presencial' | 'online' }[] }) {
    return this.svc.saveSlots(req.user.id, body.slots)
  }

  @Get('blocked')
  getBlocked(@Request() req: any) { return this.svc.getBlockedDates(req.user.id) }

  @Post('blocked')
  addBlocked(@Request() req: any, @Body() body: { date: string; reason?: string }) {
    return this.svc.addBlockedDate(req.user.id, body.date, body.reason)
  }

  @Delete('blocked/:id')
  removeBlocked(@Param('id') id: string, @Request() req: any) {
    return this.svc.removeBlockedDate(id, req.user.id)
  }
}
