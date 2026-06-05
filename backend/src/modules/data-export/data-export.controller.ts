import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { Response } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AuditService } from '../audit/audit.service'
import { DataExportService } from './data-export.service'

@Controller('data-export')
@UseGuards(JwtAuthGuard)
export class DataExportController {
  constructor(
    private readonly dataExport: DataExportService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @SkipThrottle()
  async download(@Req() req: any, @Res() res: Response) {
    const stamp = new Date().toISOString().slice(0, 10)
    const filename = `usecognia-dados-${stamp}.pdf`
    const buffer = await this.dataExport.buildPdfExport(req.user.id)
    await this.audit.record({
      userId: req.user.id,
      action: 'data_export.downloaded',
      resource: 'data_export',
      metadata: { format: 'pdf', filename },
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    })

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'private, no-store',
    })
    res.end(buffer)
  }
}
