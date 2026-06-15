import { Type } from 'class-transformer'
import { IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator'

class PushSubscriptionKeysDto {
  @IsString()
  @MaxLength(500)
  p256dh: string

  @IsString()
  @MaxLength(200)
  auth: string
}

export class SavePushSubscriptionDto {
  @IsString()
  @MaxLength(2000)
  endpoint: string

  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys: PushSubscriptionKeysDto
}

export class RemovePushSubscriptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  endpoint?: string
}
