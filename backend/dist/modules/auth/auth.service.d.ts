import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailService } from '../email/email.service';
export declare class AuthService {
    private users;
    private jwt;
    private email;
    constructor(users: Repository<User>, jwt: JwtService, email: EmailService);
    register(dto: RegisterDto): Promise<{
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
        token: string;
    }>;
    login(dto: LoginDto): Promise<{
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
        token: string;
    }>;
    findById(id: string): Promise<User>;
    private buildResponse;
}
