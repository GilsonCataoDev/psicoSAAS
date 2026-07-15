import {
  BadRequestException, Controller, Delete, Get, Param, ParseUUIDPipe,
  Post, Request, Res, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { Response } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { NoImpersonationGuard } from '../../common/guards/no-impersonation.guard'
import { AuditService } from '../audit/audit.service'
import { PatientAttachmentsService } from './patient-attachments.service'
import { pdfAttachment } from '../../common/http/content-disposition.util'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

// NoImpersonationGuard (após JwtAuthGuard) bloqueia arquivos clínicos durante impersonação.
@Controller('patients/:patientId/attachments')
@UseGuards(JwtAuthGuard, CsrfGuard, NoImpersonationGuard)
export class PatientAttachmentsController {
  constructor(
    private readonly svc: PatientAttachmentsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(@Param('patientId', ParseUUIDPipe) patientId: string, @Request() req: any) {
    return this.svc.list(patientId, req.user.id)
  }

  @Post()
  @Throttle({ long: { limit: 30, ttl: 60 * 60 * 1000 } })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(new BadRequestException('Envie um arquivo PDF, JPG ou PNG'), false)
        return
      }
      cb(null, true)
    },
  }))
  async upload(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @UploadedFile() file: any,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('Envie um arquivo PDF, JPG ou PNG')
    const attachment = await this.svc.add(patientId, req.user.id, file)
    await this.record(req, 'patient.attachment_added', patientId, {
      attachmentId: attachment.id,
      filename: attachment.filename,
      size: attachment.size,
    })
    return attachment
  }

  @Get(':attachmentId/download')
  async download(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const { filename, mimeType, buffer } = await this.svc.download(attachmentId, patientId, req.user.id)
    await this.record(req, 'patient.attachment_downloaded', patientId, { attachmentId, filename })
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': pdfAttachment(filename),
      'Content-Length': buffer.length,
      'Cache-Control': 'private, no-store',
    })
    res.end(buffer)
  }

  @Delete(':attachmentId')
  async remove(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Request() req: any,
  ) {
    const result = await this.svc.remove(attachmentId, patientId, req.user.id)
    await this.record(req, 'patient.attachment_deleted', patientId, { attachmentId })
    return result
  }

  private record(req: any, action: string, patientId: string, metadata?: Record<string, unknown>) {
    return this.audit.record({
      userId: req.user.id,
      action,
      resource: 'patient',
      resourceId: patientId,
      metadata,
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    })
  }
}
