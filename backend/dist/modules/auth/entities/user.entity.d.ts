import { Patient } from '../../patients/entities/patient.entity';
export declare class User {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    crp: string;
    specialty?: string;
    avatarUrl?: string;
    isActive: boolean;
    onboardingCompleted: boolean;
    phone?: string;
    cpfCnpj?: string;
    termsAcceptedAt?: Date;
    termsVersion?: string;
    referralCode?: string;
    emailVerified: boolean;
    emailVerificationToken?: string;
    emailVerificationExpiry?: Date;
    resetPasswordToken?: string;
    resetPasswordExpiry?: Date;
    preferences?: Record<string, unknown>;
    patients: Patient[];
    createdAt: Date;
    updatedAt: Date;
}
