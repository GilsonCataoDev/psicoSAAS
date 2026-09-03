import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator'

export class RegisterNativePushTokenDto {
  @IsString()
  @MaxLength(500)
  token: string

  @IsIn(['android', 'ios'])
  platform: 'android' | 'ios'
}

export class RemoveNativePushTokenDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  token?: string
}
