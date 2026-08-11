import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Patient } from '../patients/entities/patient.entity'
import { AiConsentEvent } from './entities/ai-consent-event.entity'
import { AiConsentService } from './ai-consent.service'
import { AiGovernanceController } from './ai-governance.controller'
import { ClinicalAiDraft } from './entities/clinical-ai-draft.entity'
import { ClinicalAiDraftService } from './clinical-ai-draft.service'

@Module({
  imports: [TypeOrmModule.forFeature([AiConsentEvent, ClinicalAiDraft, Patient])],
  providers: [AiConsentService, ClinicalAiDraftService],
  controllers: [AiGovernanceController],
  exports: [AiConsentService, ClinicalAiDraftService],
})
export class AiGovernanceModule {}
