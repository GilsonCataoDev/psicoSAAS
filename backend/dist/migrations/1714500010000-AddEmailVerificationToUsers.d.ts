import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddEmailVerificationToUsers1714500010000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
