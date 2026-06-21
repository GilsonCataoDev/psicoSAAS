import { IsBoolean } from 'class-validator'

export class UpdateTestimonialApprovalDto {
  @IsBoolean()
  approvedForPublic: boolean
}
