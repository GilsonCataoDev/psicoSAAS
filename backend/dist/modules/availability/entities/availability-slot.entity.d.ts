import { User } from '../../auth/entities/user.entity';
export declare class AvailabilitySlot {
    id: string;
    weekday: number;
    startTime: string;
    endTime: string;
    modality: 'presencial' | 'online';
    isActive: boolean;
    psychologistId: string;
    psychologist: User;
    createdAt: Date;
}
