import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Prospect } from './entities/prospect.entity'
import { ProspectSignal } from './entities/prospect-signal.entity'
import { ProspectActivity } from './entities/prospect-activity.entity'
import { ProspectingSearch } from './entities/prospecting-search.entity'
import { ProspectingController } from './prospecting.controller'
import { ProspectingService } from './prospecting.service'
import { QueryBuilderService } from './query-builder/query-builder.service'
import { DedupeService } from './dedup/dedupe.service'
import { ScoringService } from './scoring/scoring.service'
import { DraftService } from './draft/draft.service'
import { SsrfGuard } from './crawler/ssrf-guard'
import { RobotsService } from './crawler/robots.service'
import { SiteCrawlerService } from './crawler/site-crawler.service'
import { MockSearchProvider } from './providers/mock-search.provider'
import { GenericHttpSearchProvider } from './providers/generic-http-search.provider'
import { GoogleCustomSearchProvider } from './providers/google-custom-search.provider'
import { TavilySearchProvider } from './providers/tavily-search.provider'
import { searchProviderFactory } from './providers/search-provider.factory'
import { DiscoverProspectsJob } from './jobs/discover-prospects.job'
import { AnalyzePendingProspectsJob } from './jobs/analyze-pending-prospects.job'
import { ExpireOldProspectsJob } from './jobs/expire-old-prospects.job'
import { RetryFailedAnalysesJob } from './jobs/retry-failed-analyses.job'
import { CalculateProspectingMetricsJob } from './jobs/calculate-prospecting-metrics.job'
import { AdvisoryLockModule } from '../../common/advisory-lock/advisory-lock.module'
import { SessionsModule } from '../sessions/sessions.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Prospect, ProspectSignal, ProspectActivity, ProspectingSearch]),
    AdvisoryLockModule,
    SessionsModule,
  ],
  controllers: [ProspectingController],
  providers: [
    ProspectingService,
    QueryBuilderService,
    DedupeService,
    ScoringService,
    DraftService,
    SsrfGuard,
    RobotsService,
    SiteCrawlerService,
    MockSearchProvider,
    GenericHttpSearchProvider,
    GoogleCustomSearchProvider,
    TavilySearchProvider,
    searchProviderFactory,
    DiscoverProspectsJob,
    AnalyzePendingProspectsJob,
    ExpireOldProspectsJob,
    RetryFailedAnalysesJob,
    CalculateProspectingMetricsJob,
  ],
  exports: [ProspectingService],
})
export class ProspectingModule {}
