import { IsIn } from 'class-validator'

export const MANUAL_PROSPECT_STAGES = [
  'discovered', 'contacted', 'replied', 'interested', 'registered', 'activated', 'discarded',
] as const

export type ManualProspectStage = typeof MANUAL_PROSPECT_STAGES[number]

export class UpdateProspectStageDto {
  @IsIn(MANUAL_PROSPECT_STAGES)
  status: ManualProspectStage
}

