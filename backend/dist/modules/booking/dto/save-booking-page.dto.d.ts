export declare class SaveBookingPageDto {
    slug: string;
    isActive?: boolean;
    title?: string;
    description?: string;
    sessionPrice?: number;
    sessionDuration?: number;
    slotInterval?: number;
    allowPresencial?: boolean;
    allowOnline?: boolean;
    minAdvanceDays?: number;
    maxAdvanceDays?: number;
    requirePaymentUpfront?: boolean;
    pixKey?: string;
    confirmationMessage?: string;
}
