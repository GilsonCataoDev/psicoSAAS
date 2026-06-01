import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddAvatarUrlToUsers1714500011000 implements MigrationInterface {
  name = 'AddAvatarUrlToUsers1714500011000'

  async up(queryRunner: QueryRunner): Promise<void> {
    const hasAvatarUrl = await queryRunner.hasColumn('users', 'avatarUrl')
    if (!hasAvatarUrl) {
      await queryRunner.addColumn('users', new TableColumn({
        name: 'avatarUrl',
        type: 'varchar',
        isNullable: true,
      }))
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const hasAvatarUrl = await queryRunner.hasColumn('users', 'avatarUrl')
    if (hasAvatarUrl) {
      await queryRunner.dropColumn('users', 'avatarUrl')
    }
  }
}
