import { Body, Controller, Delete, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { AdminGuard } from '../../common/guards/admin.guard'
import { ProspectingService } from './prospecting.service'
import { ProspectingConversationService } from './conversations/prospecting-conversation.service'
import { ProspectingMessageService } from './messages/prospecting-message.service'
import { MessageProviderFactory } from './providers/message-provider.factory'
import { CreateSearchDto, PreviewSearchDto } from './dto/create-search.dto'
import { SuggestReplyDto } from './dto/suggest-reply.dto'
import { AnalyzeSalesConversationDto } from './dto/analyze-sales-conversation.dto'
import { UpdateProspectStageDto } from './dto/update-prospect-stage.dto'
import { ProspectStatus } from './entities/prospect.entity'
import { ConversationChannel } from './entities/prospect-conversation.entity'

@Controller('admin/prospecting')
@UseGuards(JwtAuthGuard, CsrfGuard, AdminGuard)
export class ProspectingController {
  constructor(
    private readonly svc: ProspectingService,
    private readonly conversationSvc: ProspectingConversationService,
    private readonly messageSvc: ProspectingMessageService,
    private readonly providerFactory: MessageProviderFactory,
  ) {}

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

  @Post('assistant/analyze')
  analyzeSalesConversation(@Body() dto: AnalyzeSalesConversationDto) {
    return this.svc.analyzeSalesConversation(dto)
  }

  @Post('prospects/:id/stage')
  updateStage(@Param('id') id: string, @Body() dto: UpdateProspectStageDto, @Request() req: any) {
    return this.svc.updateStage(id, dto.status, req.user?.id)
  }

  // ─── Conversas ────────────────────────────────────────────────────────────

  @Post('prospects/:id/conversations')
  createConversation(
    @Param('id') prospectId: string,
    @Body('channel') channel: ConversationChannel,
    @Request() req: any,
  ) {
    return this.conversationSvc.createConversation(prospectId, channel, req.user?.id)
  }

  @Get('prospects/:id/conversations')
  listConversations(@Param('id') prospectId: string) {
    return this.conversationSvc.listConversations(prospectId)
  }

  @Get('conversations/:id')
  getConversation(@Param('id') id: string) {
    return this.conversationSvc.getConversation(id)
  }

  @Post('conversations/:id/pause')
  pauseConversation(@Param('id') id: string, @Request() req: any) {
    return this.conversationSvc.pause(id, req.user?.id)
  }

  @Post('conversations/:id/opt-out')
  optOutConversation(@Param('id') id: string, @Request() req: any) {
    return this.conversationSvc.optOut(id, req.user?.id)
  }

  @Post('conversations/:id/convert')
  convertConversation(@Param('id') id: string, @Request() req: any) {
    return this.conversationSvc.convert(id, req.user?.id)
  }

  // ─── Mensagens ────────────────────────────────────────────────────────────

  @Post('conversations/:id/draft')
  createDraftMessage(
    @Param('id') conversationId: string,
    @Body('content') content: string,
    @Body('aiGenerated') aiGenerated: boolean = false,
    @Request() req: any,
  ) {
    return this.messageSvc.createDraft(conversationId, content, aiGenerated, req.user?.id)
  }

  @Get('messages/:id')
  getMessage(@Param('id') id: string) {
    return this.messageSvc.getMessage(id)
  }

  @Post('messages/:id/approve')
  approveMessage(
    @Param('id') messageId: string,
    @Body('notes') notes: string | undefined,
    @Request() req: any,
  ) {
    return this.messageSvc.approve(messageId, req.user?.id, notes)
  }

  @Post('messages/:id/send')
  async sendMessage(@Param('id') messageId: string) {
    const message = await this.messageSvc.getMessage(messageId)
    const conversation = await this.conversationSvc.getConversation(message.conversationId)
    const provider = this.providerFactory.getProvider(conversation.channel)
    const result = await provider.send(message, conversation)
    return this.messageSvc.send(messageId, result.messageId)
  }

  @Post('conversations/:id/inbound')
  recordInbound(
    @Param('id') conversationId: string,
    @Body('content') content: string,
    @Body('providerMessageId') providerMessageId: string | undefined,
    @Request() req: any,
  ) {
    return this.messageSvc.autoClassifyAndHandle(conversationId, content, providerMessageId, req.user?.id)
  }

  // ─── Métricas ─────────────────────────────────────────────────────────────

  @Get('metrics')
  metrics() {
    return this.svc.metrics()
  }
}
