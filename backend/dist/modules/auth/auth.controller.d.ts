import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Response as Res } from 'express';
export declare class AuthController {
    private auth;
    constructor(auth: AuthService);
    register(dto: RegisterDto, res: Res): Promise<{
        user: {
            id: string;
            name: string;
            email: string;
            crp: string;
            specialty?: string;
            avatarUrl?: string;
            isActive: boolean;
            onboardingCompleted: boolean;
            phone?: string;
            referralCode?: string;
            preferences?: Record<string, unknown>;
            patients: import("../patients/entities/patient.entity").Patient[];
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    login(dto: LoginDto, res: Res): Promise<{
        user: {
            id: string;
            name: string;
            email: string;
            crp: string;
            specialty?: string;
            avatarUrl?: string;
            isActive: boolean;
            onboardingCompleted: boolean;
            phone?: string;
            referralCode?: string;
            preferences?: Record<string, unknown>;
            patients: import("../patients/entities/patient.entity").Patient[];
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    logout(res: Res): {
        message: string;
    };
    me(req: any): any;
}
