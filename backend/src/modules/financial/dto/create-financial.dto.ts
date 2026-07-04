import { IsString, IsNumber, IsOptional, IsIn, Min, IsDateString, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateFinancialDto {
  /** Vínculo com paciente é opcional (despesa sem paciente, etc.) */
  @IsString() @IsOptional() patientId?: string
  @IsIn(['income','expense']) type: 'income' | 'expense'
  @IsNumber() @Min(0) @Type(() => Number) amount: number
  @IsString() @MaxLength(180) description: string
  @IsIn(['paid','pending','overdue']) @IsOptional() status?: string
  @IsString() @IsOptional() sessionId?: string
  @IsDateString() @IsOptional() dueDate?: string
  @IsDateString() @IsOptional() paidAt?: string
  @IsIn(['pix','credit_card','debit_card','cash','transfer','manual']) @IsOptional() method?: string
}
