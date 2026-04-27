export declare class CreateBookingDto {
    patientName: string;
    patientEmail: string;
    patientPhone?: string;
    date: string;
    time: string;
    modality?: 'presencial' | 'online';
    patientNotes?: string;
}
