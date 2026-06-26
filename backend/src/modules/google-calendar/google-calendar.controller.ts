import {
  Controller, Delete, Get, Query, Request, Res, UseGuards,
} from '@nestjs/common'
import type { Response } from 'express'
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { PublicRoute } from '../../common/decorators/public-route.decorator'
import { GoogleCalendarService } from './google-calendar.service'

@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(private readonly googleCalendar: GoogleCalendarService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  status(@Request() req: any) {
    return this.googleCalendar.getStatus(req.user.id)
  }

  @Get('connect')
  @UseGuards(JwtAuthGuard)
  connect(@Request() req: any) {
    return { url: this.googleCalendar.getAuthUrl(req.user.id) }
  }

  @Get('callback')
  @PublicRoute()
  @Throttle({ short: { limit: 20, ttl: 60 * 1000 } })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error) {
      return res.redirect(this.googleCalendar.getFailureRedirectUrl('access_denied'))
    }
    try {
      const { redirectUrl } = await this.googleCalendar.handleCallback(code, state)
      return res.redirect(redirectUrl)
    } catch {
      return res.redirect(this.googleCalendar.getFailureRedirectUrl('callback_failed'))
    }
  }

  @Delete('disconnect')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  disconnect(@Request() req: any) {
    return this.googleCalendar.disconnect(req.user.id)
  }
}
