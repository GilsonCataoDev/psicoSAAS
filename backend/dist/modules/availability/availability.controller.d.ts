import { AvailabilityService } from './availability.service';
export declare class AvailabilityController {
    private svc;
    constructor(svc: AvailabilityService);
    getSlots(req: any): Promise<import("./entities/availability-slot.entity").AvailabilitySlot[]>;
    saveSlots(req: any, body: {
        slots: {
            weekday: number;
            startTime: string;
            endTime: string;
        }[];
    }): Promise<import("./entities/availability-slot.entity").AvailabilitySlot[]>;
    getBlocked(req: any): Promise<import("./entities/blocked-date.entity").BlockedDate[]>;
    addBlocked(req: any, body: {
        date: string;
        reason?: string;
    }): Promise<import("./entities/blocked-date.entity").BlockedDate>;
    removeBlocked(id: string, req: any): Promise<void>;
}
