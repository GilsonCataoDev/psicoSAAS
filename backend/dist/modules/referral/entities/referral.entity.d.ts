import { User } from '../../auth/entities/user.entity';
export declare class Referral {
    id: string;
    referrerId: string;
    referrer: User;
    referredId?: string;
    code: string;
    rewardGranted: boolean;
    rewardGrantedAt?: Date;
    createdAt: Date;
}
