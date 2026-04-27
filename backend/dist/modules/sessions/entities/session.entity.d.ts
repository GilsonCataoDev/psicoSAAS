import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../auth/entities/user.entity';
export declare class Session {
    id: string;
    date: string;
    duration: number;
    appointmentId?: string;
    mood?: number;
    summary?: string;
    privateNotes?: string;
    nextSteps?: string;
    tags: string[];
    paymentStatus: string;
    paymentId?: string;
    patientId: string;
    patient: Patient;
    psychologistId: string;
    psychologist: User;
    createdAt: Date;
    updatedAt: Date;
}
