import { Repository } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Subscription } from '../subscriptions/entities/subscription.entity';
export declare class PatientsService {
    private repo;
    private subs;
    constructor(repo: Repository<Patient>, subs: Repository<Subscription>);
    private encryptFields;
    private dec;
    private findRaw;
    private checkPatientLimit;
    findAll(psychologistId: string): Promise<Patient[]>;
    findOne(id: string, psychologistId: string): Promise<Patient>;
    create(dto: CreatePatientDto, psychologistId: string): Promise<Patient>;
    update(id: string, dto: UpdatePatientDto, psychologistId: string): Promise<Patient>;
    remove(id: string, psychologistId: string): Promise<Patient>;
}
