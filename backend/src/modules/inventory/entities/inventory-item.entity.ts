import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Relation,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column({ nullable: true }) userId: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>

  @Column({ type: 'varchar', length: 200 }) name: string
  @Column({ type: 'varchar', length: 100, nullable: true }) category?: string
  @Column({ type: 'varchar', length: 20 }) unit: string

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantity: number

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minQuantity?: number

  @Column({ type: 'varchar', length: 200, nullable: true }) supplier?: string
  @Column({ type: 'text', nullable: true }) notes?: string

  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date
}
