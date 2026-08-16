import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'

export const AI_CONSENT_SCOPES = ['clinical_ai_processing', 'session_recording_transcription', 'neuropsych_ai'] as const

export class RecordAiConsentDto {
  @IsUUID() @IsOptional() patientId?: string
  @IsString() @MaxLength(40) textVersion: string
  @IsString() @MaxLength(2000) textSnapshot: string
  @IsIn(['professional_acknowledgement', 'professional_attestation', 'patient_portal']) source: string
}
