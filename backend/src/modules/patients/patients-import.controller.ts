import {
  BadRequestException, Controller, Get, HttpException, HttpStatus,
  Post, Request, Res, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { Response } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { AuditService } from '../audit/audit.service'
import { PatientsImportService } from './patients-import.service'
import { csvAttachment } from '../../common/http/content-disposition.util'
import { IMPORT_TEMPLATE_CSV } from './patients-import.template'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain']
const IMPORT_RATE_LIMIT = 5
const IMPORT_RATE_WINDOW_MS = 60 * 60 * 1000

@Controller('patients/import')
@UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
export class PatientsImportController {
  constructor(
    private readonly svc: PatientsImportService,
    private readonly audit: AuditService,
  ) {}

  @Get('template')
  downloadTemplate(@Res() res: Response) {
    const buffer = Buffer.from('﻿' + IMPORT_TEMPLATE_CSV, 'utf-8')
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': csvAttachment('modelo-importacao-pacientes.csv'),
      'Content-Length': buffer.length,
      'Cache-Control': 'private, no-store',
    })
    res.end(buffer)
  }

  @Post()
  @Throttle({ long: { limit: IMPORT_RATE_LIMIT, ttl: IMPORT_RATE_WINDOW_MS } })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    fileFilter: (_req, file, cb) => {
      const okMime = ALLOWED_MIME_TYPES.includes(file.mimetype)
      const okExt = /\.csv$/i.test(file.originalname ?? '')
      if (!okMime && !okExt) {
        cb(new BadRequestException('Envie um arquivo CSV'), false)
        return
      }
      cb(null, true)
    },
  }))
  async import(@UploadedFile() file: any, @Request() req: any) {
    if (!file) throw new BadRequestException('Envie um arquivo CSV')

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress
    const userAgent = req.headers['user-agent']
    const oneHourAgo = new Date(Date.now() - IMPORT_RATE_WINDOW_MS)
    const recentImports = await this.audit.countForUserSince(req.user.id, 'patient.import_completed', oneHourAgo)
    if (recentImports >= IMPORT_RATE_LIMIT) {
      await this.audit.record({
        userId: req.user.id,
        action: 'patient.import_rate_limited',
        resource: 'patient',
        metadata: { window: '1h', limit: IMPORT_RATE_LIMIT },
        ip,
        userAgent,
      })
      throw new HttpException('Limite de importações atingido. Tente novamente em até 1 hora.', HttpStatus.TOO_MANY_REQUESTS)
    }

    const result = await this.svc.import(file.buffer, req.user.id)

    await this.audit.record({
      userId: req.user.id,
      action: 'patient.import_completed',
      resource: 'patient',
      metadata: {
        filename: file.originalname,
        totalRows: result.totalRows,
        importedCount: result.importedCount,
        skippedCount: result.skippedCount,
        errorCount: result.errorCount,
      },
      ip,
      userAgent,
    })
    await Promise.all(result.imported.map(p => this.audit.record({
      userId: req.user.id,
      action: 'patient.created',
      resource: 'patient',
      resourceId: p.id,
      metadata: { source: 'csv_import' },
      ip,
      userAgent,
    })))

    return result
  }
}
