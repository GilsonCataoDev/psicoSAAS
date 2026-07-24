import { Body, Controller, Delete, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AdminGuard } from '../../common/guards/admin.guard'
import { ProspectingService } from './prospecting.service'
import { CreateSearchDto, PreviewSearchDto } from './dto/create-search.dto'
import { SuggestReplyDto } from './dto/suggest-reply.dto'
import { ProspectStatus } from './entities/prospect.entity'

@Controller('admin/prospecting')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ProspectingController {
  constructor(private readonly svc: ProspectingService) {}

  @Post('searches/preview')
  preview(@Body() dto: PreviewSearchDto) {
    return this.svc.previewSearch(dto)
  }

  @Post('searches')
  createSearch(@Body() dto: CreateSearchDto, @Request() req: any) {
    return this.svc.createSearch(dto, req.user?.id)
  }

  @Get('searches')
  listSearches() {
    return this.svc.listSearches()
  }

  @Get('prospects')
  listProspects(
    @Query('city') city?: string,
    @Query('state') state?: string,
    @Query('status') status?: ProspectStatus,
    @Query('minScore') minScore?: string,
    @Query('source') source?: string,
    @Query('hasEmail') hasEmail?: string,
    @Query('hasPhone') hasPhone?: string,
    @Query('hasLinkedin') hasLinkedin?: string,
    @Query('hasPsymeet') hasPsymeet?: string,
  ) {
    return this.svc.listProspects({
      city, state, status,
      minScore: minScore ? Number(minScore) : undefined,
      source,
      hasEmail: hasEmail === 'true',
      hasPhone: hasPhone === 'true',
      hasLinkedin: hasLinkedin === 'true',
      hasPsymeet: hasPsymeet === 'true',
    })
  }

  @Get('prospects/:id')
  getProspect(@Param('id') id: string) {
    return this.svc.getProspect(id)
  }

  @Post('prospects/:id/analyze')
  analyze(@Param('id') id: string, @Request() req: any) {
    return this.svc.analyzeProspect(id, req.user?.id)
  }

  @Post('prospects/:id/approve')
  approve(@Param('id') id: string, @Body('notes') notes: string | undefined, @Request() req: any) {
    return this.svc.approve(id, req.user?.id, notes)
  }

  @Post('prospects/:id/discard')
  discard(@Param('id') id: string, @Body('notes') notes: string | undefined, @Request() req: any) {
    return this.svc.discard(id, req.user?.id, notes)
  }

  @Post('prospects/:id/do-not-contact')
  doNotContact(@Param('id') id: string, @Body('notes') notes: string | undefined, @Request() req: any) {
    return this.svc.markDoNotContact(id, req.user?.id, notes)
  }

  @Delete('prospects/:id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.svc.deleteProspect(id, req.user?.id)
  }

  @Get('prospects/:id/export')
  exportProspect(@Param('id') id: string) {
    return this.svc.exportProspect(id)
  }

  @Post('prospects/:id/draft')
  draft(@Param('id') id: string, @Request() req: any) {
    return this.svc.generateDraft(id, req.user?.id)
  }

  @Post('prospects/:id/suggest-reply')
  suggestReply(@Param('id') id: string, @Body() dto: SuggestReplyDto, @Request() req: any) {
    return this.svc.suggestReply(id, dto, req.user?.id)
  }

  @Get('metrics')
  metrics() {
    return this.svc.metrics()
  }
}
