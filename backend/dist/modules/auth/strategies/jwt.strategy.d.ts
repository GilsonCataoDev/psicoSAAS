import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private auth;
    constructor(cfg: ConfigService, auth: AuthService);
    validate(payload: {
        sub: string;
        email: string;
    }): Promise<any>;
}
export {};
