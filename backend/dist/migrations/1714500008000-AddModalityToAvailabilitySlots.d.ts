import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddModalityToAvailabilitySlots1714500008000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
