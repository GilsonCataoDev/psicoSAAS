import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

@Entity('login_attempts')
export class LoginAttempt {
  @PrimaryColumn({ type: 'varchar', length: 254 })
  email: string

  @Column({ type: 'int', default: 0 })
  count: number

  @Column({ type: 'timestamptz' })
  resetAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date
}
