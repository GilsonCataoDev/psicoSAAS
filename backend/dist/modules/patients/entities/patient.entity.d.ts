import { User } from '../../auth/entities/user.entity';
import { Session } from '../../sessions/entities/session.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
export type PatientStatus = 'active' | 'paused' | 'discharged';
export declare class Patient {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    birthDate?: string;
    pronouns?: string;
    status: PatientStatus;
    sessionPrice: number;
    sessionDuration: number;
    startDate?: string;
    avatarColor?: string;
    privateNotes?: string;
    prontuario?: Record<string, any>;
    cpfCnpj?: string;
    asaasCustomerId?: string;
    tags: string[];
    psychologistId: string;
    psychologist: User;
    sessions: Session[];
    appointments: Appointment[];
    createdAt: Date;
    updatedAt: Date;
}
