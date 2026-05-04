import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { Response } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { DataExportService } from './data-export.service'

@Controller('data-export')
@UseGuards(JwtAuthGuard)
export class DataExportController {
  constructor(private readonly dataExport: DataExportService) {}

  @Get()
  @SkipThrottle()
  async download(@Req() req: any, @Res() res: Response) {
    const payload = await this.dataExport.buildExport(req.user.id)
    const stamp = new Date().toISOString().slice(0, 10)
    const filename = `usecognia-dados-${stamp}.json`
    const buffer = Buffer.from(JSON.stringify(payload, null, 2), 'utf8')

    res.set({
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'private, no-store',
    })
    res.end(buffer)
  }
}
