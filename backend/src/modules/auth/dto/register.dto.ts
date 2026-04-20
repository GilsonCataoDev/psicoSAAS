import { IsEmail, IsString, MinLength } from 'class-validator'

export class RegisterDto {
  @IsString() name: string
  @IsEmail() email: string
  @IsString() crp: string
  @IsString() @MinLength(8) password: string
  @IsString() specialty?: string
}
