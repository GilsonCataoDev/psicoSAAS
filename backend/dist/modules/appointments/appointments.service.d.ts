import { DataSource } from 'typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { Booking } from '../booking/entities/booking.entity';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
export declare class AppointmentsService {
    private repo;
    private bookings;
    private dataSource;
    private notifications;
    private googleCalendar;
    constructor(repo: Repository<Appointment>, bookings: Repository<Booking>, dataSource: DataSource, notifications: NotificationsService, googleCalendar: GoogleCalendarService);
    findAll(psychologistId: string, dateFrom?: string, dateTo?: string): Promise<Appointment[]>;
    findOne(id: string, psychologistId: string): Promise<Appointment>;
    create(dto: CreateAppointmentDto, psychologistId: string): Promise<Appointment>;
    updateStatus(id: string, status: string, psychologistId: string): Promise<Appointment>;
    remove(id: string, psychologistId: string): Promise<Appointment>;
}
