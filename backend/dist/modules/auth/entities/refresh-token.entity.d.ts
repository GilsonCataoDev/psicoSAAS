export declare class RefreshToken {
    id: string;
    tokenHash: string;
    userId: string;
    userAgent?: string;
    ipAddress?: string;
    revoked: boolean;
    expiresAt: Date;
    createdAt: Date;
}
