import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator'

export class UpdateOnboardingDto {
  @IsOptional()
  @IsBoolean()
  firstLogin?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  onboardingStep?: number
}
