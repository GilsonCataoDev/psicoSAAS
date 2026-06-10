import { IsIn, IsOptional, IsString } from 'class-validator'

export class OverrideSubscriptionDto {
  @IsOptional()
  @IsString()
  @IsIn(['active', 'trialing', 'past_due', 'canceled', 'pending'])
  status?: string

  @IsOptional()
  @IsString()
  @IsIn(['free', 'essencial', 'pro'])
  plan?: string
}
