import { Repository } from 'typeorm';
import { AvailabilitySlot } from './entities/availability-slot.entity';
import { BlockedDate } from './entities/blocked-date.entity';
export declare class AvailabilityService {
    private slots;
    private blocked;
    constructor(slots: Repository<AvailabilitySlot>, blocked: Repository<BlockedDate>);
    findAll(psychologistId: string): Promise<AvailabilitySlot[]>;
    getSlotsForDay(psychologistId: string, weekday: number, modality?: 'presencial' | 'online'): Promise<AvailabilitySlot[]>;
    isDateBlocked(psychologistId: string, date: string): Promise<boolean>;
    saveSlots(psychologistId: string, slotsData: {
        weekday: number;
        startTime: string;
        endTime: string;
        modality?: 'presencial' | 'online';
    }[]): Promise<AvailabilitySlot[]>;
    getBlockedDates(psychologistId: string): Promise<BlockedDate[]>;
    addBlockedDate(psychologistId: string, date: string, reason?: string): Promise<BlockedDate>;
    removeBlockedDate(id: string, psychologistId: string): Promise<void>;
}
