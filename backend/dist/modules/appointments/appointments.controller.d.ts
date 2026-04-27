import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
export declare class AppointmentsController {
    private svc;
    constructor(svc: AppointmentsService);
    findAll(req: any, from?: string, to?: string): Promise<import("./entities/appointment.entity").Appointment[]>;
    findOne(id: string, req: any): Promise<import("./entities/appointment.entity").Appointment>;
    create(dto: CreateAppointmentDto, req: any): Promise<import("./entities/appointment.entity").Appointment>;
    updateStatus(id: string, status: string, req: any): Promise<import("./entities/appointment.entity").Appointment>;
    remove(id: string, req: any): Promise<import("./entities/appointment.entity").Appointment>;
}
