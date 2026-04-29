import { IsString, IsNumber, IsOptional, IsIn, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateFinancialDto {
  /** Vínculo com paciente é opcional (despesa sem paciente, etc.) */
  @IsString() @IsOptional() patientId?: string
  @IsIn(['income','expense']) type: 'income' | 'expense'
  @IsNumber() @Min(0) @Type(() => Number) amount: number
  @IsString() description: string
  @IsString() @IsOptional() sessionId?: string
  @IsString() @IsOptional() dueDate?: string
  @IsIn(['pix','credit_card','debit_card','cash','transfer','manual']) @IsOptional() method?: string
}
