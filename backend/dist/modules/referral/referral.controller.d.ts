import { ReferralService } from './referral.service';
export declare class ReferralController {
    private svc;
    constructor(svc: ReferralService);
    getMyReferral(req: any): Promise<{
        code: string;
        totalInvited: number;
        totalRewarded: number;
    }>;
}
