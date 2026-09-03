import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
import { Type } from 'class-transformer'

export const EXPENSE_CATEGORIES = [
  'aluguel', 'marketing', 'supervisao', 'materiais', 'assinaturas', 'impostos', 'outros',
] as const

export class CreateRecurringExpenseDto {
  @IsString() @MaxLength(180) description: string
  @IsNumber() @Min(0.01) @Type(() => Number) amount: number
  @IsIn(EXPENSE_CATEGORIES) @IsOptional() category?: string
  @IsInt() @Min(1) @Max(28) @Type(() => Number) dayOfMonth: number
}

export class UpdateRecurringExpenseDto {
  @IsString() @MaxLength(180) @IsOptional() description?: string
  @IsNumber() @Min(0.01) @Type(() => Number) @IsOptional() amount?: number
  @IsIn(EXPENSE_CATEGORIES) @IsOptional() category?: string
  @IsInt() @Min(1) @Max(28) @Type(() => Number) @IsOptional() dayOfMonth?: number
  @IsBoolean() @IsOptional() active?: boolean
}
