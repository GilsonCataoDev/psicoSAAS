import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../auth/entities/user.entity';
export declare class Appointment {
    id: string;
    date: string;
    time: string;
    duration: number;
    status: string;
    modality: string;
    notes?: string;
    patientId: string;
    patient: Patient;
    psychologistId: string;
    psychologist: User;
    createdAt: Date;
}
