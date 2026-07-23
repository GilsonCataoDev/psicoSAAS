import { Controller, Get, HttpException, HttpStatus, Req, Res, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Response } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { AuditService } from '../audit/audit.service'
import { DataExportService } from './data-export.service'
import { pdfAttachment } from '../../common/http/content-disposition.util'

@Controller('data-export')
@UseGuards(JwtAuthGuard, NoImpersonationGuard)
export class DataExportController {
  constructor(
    private readonly dataExport: DataExportService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Throttle({ long: { limit: 3, ttl: 60 * 60 * 1000 } })
  async download(@Req() req: any, @Res() res: Response) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentExports = await this.audit.countForUserSince(req.user.id, 'data_export.downloaded', oneHourAgo)
    if (recentExports >= 3) {
      await this.audit.record({
        userId: req.user.id,
        action: 'data_export.rate_limited',
        resource: 'data_export',
        metadata: { window: '1h', limit: 3 }, // Audit trail sem incluir conteúdo exportado.
        ip,
        userAgent: req.headers['user-agent'],
      })
      throw new HttpException('Limite de exportações atingido. Tente novamente em até 1 hora.', HttpStatus.TOO_MANY_REQUESTS)
    }

    const stamp = new Date().toISOString().slice(0, 10)
    const filename = `usecognia-dados-${stamp}.pdf`
    const buffer = await this.dataExport.buildPdfExport(req.user.id)
    await this.audit.record({
      userId: req.user.id,
      action: 'data_export.downloaded',
      resource: 'data_export',
      metadata: { format: 'pdf', filename },
      ip,
      userAgent: req.headers['user-agent'],
    })

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': pdfAttachment(filename),
      'Content-Length': buffer.length,
      'Cache-Control': 'private, no-store',
    })
    res.end(buffer)
  }
}
