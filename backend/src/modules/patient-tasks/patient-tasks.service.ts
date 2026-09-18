import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Not, Repository } from 'typeorm'
import { PatientTask } from './entities/patient-task.entity'
import { Patient } from '../patients/entities/patient.entity'
import { CreatePatientTaskDto } from './dto/create-patient-task.dto'
import { UpdatePatientTaskDto } from './dto/update-patient-task.dto'

@Injectable()
export class PatientTasksService {
  constructor(
    @InjectRepository(PatientTask) private repo: Repository<PatientTask>,
    @InjectRepository(Patient) private patients: Repository<Patient>,
  ) {}

  private async assertPatientBelongsToUser(patientId: string, userId: string): Promise<void> {
    const exists = await this.patients.findOne({ where: { id: patientId, psychologistId: userId }, select: ['id'] })
    if (!exists) throw new NotFoundException('Pessoa não encontrada')
  }

  async create(patientId: string, userId: string, dto: CreatePatientTaskDto): Promise<PatientTask> {
    await this.assertPatientBelongsToUser(patientId, userId)
    const task = this.repo.create({ ...dto, patientId, userId })
    return this.repo.save(task)
  }

  async findAll(patientId: string, userId: string): Promise<PatientTask[]> {
    await this.assertPatientBelongsToUser(patientId, userId)
    return this.repo.find({
      where: { patientId, userId },
      order: { createdAt: 'DESC' },
    })
  }

  async update(patientId: string, taskId: string, userId: string, dto: UpdatePatientTaskDto): Promise<PatientTask> {
    const task = await this.repo.findOne({ where: { id: taskId, patientId, userId } })
    if (!task) throw new NotFoundException('Tarefa não encontrada')
    Object.assign(task, dto)
    return this.repo.save(task)
  }

  async remove(patientId: string, taskId: string, userId: string): Promise<{ removed: boolean }> {
    const task = await this.repo.findOne({ where: { id: taskId, patientId, userId } })
    if (!task) throw new NotFoundException('Tarefa não encontrada')
    await this.repo.remove(task)
    return { removed: true }
  }

  /** Chamado pelo portal do paciente — valida apenas que a tarefa pertence ao paciente. */
  async completeByPortal(taskId: string, patientId: string): Promise<PatientTask> {
    const task = await this.repo.findOne({ where: { id: taskId, patientId } })
    if (!task) throw new NotFoundException('Tarefa não encontrada')
    task.completedAt = new Date()
    return this.repo.save(task)
  }

  async uncompleteByPortal(taskId: string, patientId: string): Promise<PatientTask> {
    const task = await this.repo.findOne({ where: { id: taskId, patientId } })
    if (!task) throw new NotFoundException('Tarefa não encontrada')
    task.completedAt = undefined
    return this.repo.save(task)
  }

  /**
   * Retorna tarefas para exibição no portal: pendentes primeiro, depois concluídas recentes.
   * Limitado a 50 para não sobrecarregar a resposta do portal.
   */
  async findForPortal(patientId: string): Promise<PatientTask[]> {
    const pending = await this.repo.find({
      where: { patientId, completedAt: IsNull() },
      order: { dueDate: 'ASC', createdAt: 'DESC' },
      take: 30,
    })
    const completed = await this.repo.find({
      where: { patientId, completedAt: Not(IsNull()) },
      order: { completedAt: 'DESC' },
      take: 20,
    })
    return [...pending, ...completed]
  }
}
