import { IsString, IsEmail, IsOptional, IsNumber, IsArray, IsIn } from 'class-validator'

export class CreatePatientDto {
  @IsString() name: string
  @IsEmail() @IsOptional() email?: string
  @IsString() @IsOptional() phone?: string
  @IsString() @IsOptional() birthDate?: string
  @IsString() @IsOptional() pronouns?: string
  @IsNumber() @IsOptional() sessionPrice?: number
  @IsNumber() @IsOptional() sessionDuration?: number
  @IsString() @IsOptional() startDate?: string
  @IsArray() @IsOptional() tags?: string[]
  @IsIn(['active','paused','discharged']) @IsOptional() status?: string
}
