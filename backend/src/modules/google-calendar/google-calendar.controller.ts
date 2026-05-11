import {
  Controller, Delete, Get, Query, Request, Res, UseGuards,
} from '@nestjs/common'
import type { Response } from 'express'
import { SkipThrottle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { PublicRoute } from '../../common/decorators/public-route.decorator'
import { GoogleCalendarService } from './google-calendar.service'

@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(private readonly googleCalendar: GoogleCalendarService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  status(@Request() req: any) {
    return this.googleCalendar.getStatus(req.user.id)
  }

  @Get('connect')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  connect(@Request() req: any) {
    return { url: this.googleCalendar.getAuthUrl(req.user.id) }
  }

  @Get('callback')
  @PublicRoute()
  @SkipThrottle()
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const { redirectUrl } = await this.googleCalendar.handleCallback(code, state)
    return res.redirect(redirectUrl)
  }

  @Delete('disconnect')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  @SkipThrottle()
  disconnect(@Request() req: any) {
    return this.googleCalendar.disconnect(req.user.id)
  }
}
