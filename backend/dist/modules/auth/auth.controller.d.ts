import type { Request as Req, Response as Res } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    register(dto: RegisterDto, req: Req, res: Res): Promise<{
        user: import("./auth.service").SafeUser;
        csrfToken: string;
    }>;
    login(dto: LoginDto, req: Req, res: Res): Promise<{
        user: import("./auth.service").SafeUser;
        csrfToken: string;
    }>;
    refresh(req: Req, res: Res): Promise<{
        user: import("./auth.service").SafeUser;
        csrfToken: string;
    }>;
    logout(req: any, res: Res): Promise<{
        message: string;
    }>;
    me(req: any): any;
    updateProfile(req: any, dto: UpdateProfileDto): Promise<import("./auth.service").SafeUser>;
    updatePreferences(req: any, dto: UpdatePreferencesDto): Promise<Record<string, unknown>>;
    changePassword(req: any, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    private setAuthCookies;
}
