import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'
import { LeadProfession } from '../lead.entity'

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string

  @IsEmail()
  @MaxLength(200)
  email: string

  @IsEnum(LeadProfession)
  @IsOptional()
  profession?: LeadProfession

  @IsString()
  @IsOptional()
  @MaxLength(100)
  source?: string
}
