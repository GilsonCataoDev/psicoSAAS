import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreatePatientTasks1789800000000 implements MigrationInterface {
  name = 'CreatePatientTasks1789800000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "patient_tasks" (
        "id"          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "patientId"   uuid NOT NULL,
        "userId"      uuid NOT NULL,
        "title"       character varying(200) NOT NULL,
        "description" text,
        "dueDate"     character varying,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_patient_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_patient_tasks_patient" FOREIGN KEY ("patientId")
          REFERENCES "patients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_patient_tasks_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_patient_tasks_patientId" ON "patient_tasks" ("patientId")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_patient_tasks_userId" ON "patient_tasks" ("userId")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_patient_tasks_completedAt" ON "patient_tasks" ("completedAt")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_patient_tasks_completedAt"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_patient_tasks_userId"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_patient_tasks_patientId"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "patient_tasks"`)
  }
}
