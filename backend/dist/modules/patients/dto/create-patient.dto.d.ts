export declare class CreatePatientDto {
    name: string;
    email?: string;
    phone?: string;
    birthDate?: string;
    pronouns?: string;
    sessionPrice?: number;
    sessionDuration?: number;
    startDate?: string;
    tags?: string[];
    status?: 'active' | 'paused' | 'discharged';
    privateNotes?: string;
    prontuario?: Record<string, any>;
}
