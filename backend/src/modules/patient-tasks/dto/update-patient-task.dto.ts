import { PartialType } from '@nestjs/mapped-types'
import { CreatePatientTaskDto } from './create-patient-task.dto'

export class UpdatePatientTaskDto extends PartialType(CreatePatientTaskDto) {}
