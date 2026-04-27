import { User } from '../../auth/entities/user.entity';
export declare class AvailabilitySlot {
    id: string;
    weekday: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
    psychologistId: string;
    psychologist: User;
    createdAt: Date;
}
