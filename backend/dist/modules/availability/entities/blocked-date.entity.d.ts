import { User } from '../../auth/entities/user.entity';
export declare class BlockedDate {
    id: string;
    date: string;
    reason?: string;
    psychologistId: string;
    psychologist: User;
}
