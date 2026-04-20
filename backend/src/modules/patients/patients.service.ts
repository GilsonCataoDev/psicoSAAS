import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Patient } from './entities/patient.entity'
import { CreatePatientDto } from './dto/create-patient.dto'
import { UpdatePatientDto } from './dto/update-patient.dto'

@Injectable()
export class PatientsService {
  constructor(@InjectRepository(Patient) private repo: Repository<Patient>) {}

  findAll(psychologistId: string) {
    return this.repo.find({
      where: { psychologistId },
      order: { name: 'ASC' },
    })
  }

  async findOne(id: string, psychologistId: string) {
    const patient = await this.repo.findOne({ where: { id }, relations: ['sessions', 'appointments'] })
    if (!patient) throw new NotFoundException('Pessoa não encontrada')
    if (patient.psychologistId !== psychologistId) throw new ForbiddenException()
    return patient
  }

  create(dto: CreatePatientDto, psychologistId: string) {
    const patient = this.repo.create({ ...dto, psychologistId })
    return this.repo.save(patient)
  }

  async update(id: string, dto: UpdatePatientDto, psychologistId: string) {
    const patient = await this.findOne(id, psychologistId)
    Object.assign(patient, dto)
    return this.repo.save(patient)
  }

  async remove(id: string, psychologistId: string) {
    const patient = await this.findOne(id, psychologistId)
    return this.repo.softRemove(patient)
  }
}
