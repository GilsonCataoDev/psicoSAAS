import { IsIn } from 'class-validator'

export class MarkPaidDto {
  @IsIn(['pix', 'credit_card', 'debit_card', 'cash', 'transfer', 'manual'])
  method: string
}
