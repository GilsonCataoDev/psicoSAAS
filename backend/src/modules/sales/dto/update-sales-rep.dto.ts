import { PartialType } from '@nestjs/mapped-types'
import { IsIn, IsOptional } from 'class-validator'
import { CreateSalesRepDto } from './create-sales-rep.dto'

export class UpdateSalesRepDto extends PartialType(CreateSalesRepDto) {
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive'
}
