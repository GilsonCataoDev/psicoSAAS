import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
export declare class PatientsController {
    private svc;
    constructor(svc: PatientsService);
    findAll(req: any): Promise<import("./entities/patient.entity").Patient[]>;
    findOne(id: string, req: any): Promise<import("./entities/patient.entity").Patient>;
    create(dto: CreatePatientDto, req: any): Promise<import("./entities/patient.entity").Patient>;
    update(id: string, dto: UpdatePatientDto, req: any): Promise<import("./entities/patient.entity").Patient>;
    remove(id: string, req: any): Promise<import("./entities/patient.entity").Patient>;
}
