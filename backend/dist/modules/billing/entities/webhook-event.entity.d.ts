export declare class WebhookEvent {
    id: string;
    eventId: string;
    eventType: string;
    payload: Record<string, unknown>;
    processedAt: Date;
}
