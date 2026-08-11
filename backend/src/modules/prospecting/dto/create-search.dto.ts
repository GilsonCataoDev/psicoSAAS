import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator'
import { ProspectSourceType } from '../entities/prospect.entity'

const VALID_SOURCES: ProspectSourceType[] = ['own_site', 'linkedin_search', 'psymeet_search', 'directory_search']

export class PreviewSearchDto {
  @IsString() @MaxLength(120) city: string
  @IsString() @IsOptional() @MaxLength(2) state?: string
  @IsString() @IsOptional() @MaxLength(120) profession?: string
  @IsString() @IsOptional() @MaxLength(120) approach?: string
  @IsIn(['online', 'presencial', 'ambos']) @IsOptional() modality?: 'online' | 'presencial' | 'ambos'
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(4) @IsIn(VALID_SOURCES, { each: true }) sources: ProspectSourceType[]
}

export class CreateSearchDto extends PreviewSearchDto {
  @IsOptional() maxResults?: number
}
