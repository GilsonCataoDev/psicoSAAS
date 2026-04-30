"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRefreshTokensTable1714500000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateRefreshTokensTable1714500000000 {
    async up(queryRunner) {
        await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'refresh_tokens',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'userId',
                    type: 'uuid',
                    isNullable: false,
                },
                {
                    name: 'tokenHash',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'ip',
                    type: 'varchar',
                    isNullable: true,
                },
                {
                    name: 'userAgent',
                    type: 'varchar',
                    isNullable: true,
                },
                {
                    name: 'revoked',
                    type: 'boolean',
                    isNullable: false,
                    default: false,
                },
                {
                    name: 'expiresAt',
                    type: 'timestamptz',
                    isNullable: false,
                },
                {
                    name: 'createdAt',
                    type: 'timestamptz',
                    isNullable: false,
                    default: 'now()',
                },
            ],
        }), true);
        await queryRunner.createForeignKey('refresh_tokens', new typeorm_1.TableForeignKey({
            name: 'FK_refresh_tokens_userId_users_id',
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
        }));
        await queryRunner.createIndex('refresh_tokens', new typeorm_1.TableIndex({
            name: 'IDX_refresh_tokens_userId',
            columnNames: ['userId'],
        }));
        await queryRunner.createIndex('refresh_tokens', new typeorm_1.TableIndex({
            name: 'IDX_refresh_tokens_expiresAt',
            columnNames: ['expiresAt'],
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_expiresAt');
        await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_userId');
        await queryRunner.dropForeignKey('refresh_tokens', 'FK_refresh_tokens_userId_users_id');
        await queryRunner.dropTable('refresh_tokens');
    }
}
exports.CreateRefreshTokensTable1714500000000 = CreateRefreshTokensTable1714500000000;
//# sourceMappingURL=1714500000000-CreateRefreshTokensTable.js.map