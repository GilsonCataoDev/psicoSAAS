import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreatePatientTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string

  @IsString()
  @IsOptional()
  description?: string

  /** Data de entrega no formato YYYY-MM-DD */
  @IsDateString()
  @IsOptional()
  dueDate?: string
}
