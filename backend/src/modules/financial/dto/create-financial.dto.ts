import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator'

export class CreateFinancialDto {
  @IsString() patientId: string
  @IsIn(['income','expense']) type: 'income' | 'expense'
  @IsNumber() amount: number
  @IsString() description: string
  @IsString() @IsOptional() sessionId?: string
  @IsString() @IsOptional() dueDate?: string
  @IsIn(['pix','credit_card','debit_card','cash','transfer']) @IsOptional() method?: string
}
