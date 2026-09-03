import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class ListAdminUsersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsIn(['free', 'pro'])
  plan?: string

  @IsOptional()
  @IsIn(['active', 'trialing', 'past_due', 'canceled', 'pending', 'none'])
  status?: string
}
