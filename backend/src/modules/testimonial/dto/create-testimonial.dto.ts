import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class CreateTestimonialDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  text?: string

  @IsOptional()
  @IsBoolean()
  dismissed?: boolean

  @IsOptional()
  @IsBoolean()
  publicConsent?: boolean
}
