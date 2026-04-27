export declare class CreateSessionDto {
    patientId: string;
    date: string;
    duration?: number;
    appointmentId?: string;
    mood?: number;
    summary?: string;
    privateNotes?: string;
    nextSteps?: string;
    tags?: string[];
    paymentStatus?: string;
}
