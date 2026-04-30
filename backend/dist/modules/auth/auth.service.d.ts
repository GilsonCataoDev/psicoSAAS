import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { EmailService } from '../email/email.service';
import { ReferralService } from '../referral/referral.service';
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
export interface SafeUser extends Omit<User, 'passwordHash' | 'resetPasswordToken' | 'resetPasswordExpiry'> {
}
export interface AuthResult {
    user: SafeUser;
    tokens: AuthTokens;
    csrfToken: string;
}
export declare class AuthService {
    private users;
    private rtRepo;
    private jwt;
    private email;
    private referral;
    private readonly logger;
    private readonly auditLogger;
    private readonly loginAttempts;
    private readonly MAX_ATTEMPTS;
    private readonly WINDOW_MS;
    constructor(users: Repository<User>, rtRepo: Repository<RefreshToken>, jwt: JwtService, email: EmailService, referral: ReferralService);
    register(dto: RegisterDto, ip?: string, userAgent?: string): Promise<AuthResult>;
    login(dto: LoginDto, ip?: string, userAgent?: string): Promise<AuthResult>;
    refresh(rawToken: string, ip?: string, userAgent?: string): Promise<AuthResult>;
    revokeAllTokens(userId: string, ip?: string): Promise<void>;
    findById(id: string): Promise<User | null>;
    updateProfile(id: string, data: UpdateProfileDto): Promise<SafeUser>;
    updatePreferences(id: string, preferences: UpdatePreferencesDto): Promise<Record<string, unknown>>;
    changePassword(id: string, currentPassword: string, newPassword: string): Promise<{
        message: string;
    }>;
    forgotPassword(email: string): Promise<void>;
    resetPassword(token: string, newPassword: string): Promise<void>;
    generateCsrfToken(userId: string): string;
    private buildResult;
    private createRefreshToken;
    private checkLoginRateLimit;
    private recordLoginFailure;
    private clearLoginAttempts;
    private audit;
    private maskEmail;
}
