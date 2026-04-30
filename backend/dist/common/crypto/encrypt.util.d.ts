export declare function encrypt(text: string): string;
export declare function decrypt(payload: string): string;
export declare function safeDecrypt(value: string | null | undefined): string | undefined;
export declare function hashToken(token: string): string;
export declare function generateCsrfToken(userId: string): string;
