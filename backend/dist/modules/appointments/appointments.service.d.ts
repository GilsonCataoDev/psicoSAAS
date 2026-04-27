import { Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { NotificationsService } from '../notifications/notifications.service';
export declare class AppointmentsService {
    private repo;
    private notifications;
    constructor(repo: Repository<Appointment>, notifications: NotificationsService);
    findAll(psychologistId: string, dateFrom?: string, dateTo?: string): Promise<Appointment[]>;
    findOne(id: string, psychologistId: string): Promise<Appointment>;
    create(dto: CreateAppointmentDto, psychologistId: string): Promise<Appointment>;
    updateStatus(id: string, status: string, psychologistId: string): Promise<Appointment>;
    remove(id: string, psychologistId: string): Promise<Appointment>;
}
