import { Controller, Get, Header, Param, Res } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Response } from 'express'
import { PublicRoute } from '../../common/decorators/public-route.decorator'
import { pdfAttachment } from '../../common/http/content-disposition.util'
import { NeuropsychAssessmentsService } from './neuropsych-assessments.service'

@PublicRoute()
@Controller('public/neuropsych-assessments')
export class NeuropsychAssessmentShareController {
  constructor(private readonly service: NeuropsychAssessmentsService) {}

  @Get(':token/export')
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ short: { limit: 10, ttl: 60 * 1000 } })
  async exportPdf(@Param('token') token: string, @Res() res: Response) {
    const { filename, stream } = await this.service.exportPdfByShareToken(token)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': pdfAttachment(filename),
      'Cache-Control': 'private, no-store',
    })
    stream.on('error', () => {
      if (!res.headersSent) res.status(500)
      res.end()
    })
    stream.pipe(res)
    stream.end()
  }
}
