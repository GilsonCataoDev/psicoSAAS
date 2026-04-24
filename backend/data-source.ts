/**
 * TypeORM DataSource para migrations
 * Uso:
 *   npx typeorm migration:generate src/migrations/NomeMigration -d data-source.ts
 *   npx typeorm migration:run -d data-source.ts
 *   npx typeorm migration:revert -d data-source.ts
 */
import 'dotenv/config'
import { DataSource } from 'typeorm'

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,   // NUNCA true em produção
  logging: ['migration'],
})
