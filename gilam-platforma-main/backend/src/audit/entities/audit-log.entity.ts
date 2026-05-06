import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Qaysi entity turi: EXPENSE, ORDER, USER, CUSTOMER */
  @Column({ type: 'varchar', length: 50 })
  entityType: string;

  /** O'zgartirilgan ob'ekt IDsi */
  @Column({ type: 'uuid' })
  entityId: string;

  /** Amal turi: CREATE, UPDATE, DELETE */
  @Column({ type: 'varchar', length: 20 })
  action: string;

  /** Eski qiymat (JSON) — update/delete da saqlanadi */
  @Column({ type: 'jsonb', nullable: true })
  oldData: any;

  /** Yangi qiymat (JSON) — create/update da saqlanadi */
  @Column({ type: 'jsonb', nullable: true })
  newData: any;

  /** Kim o'zgartirgan */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** Qaysi kompaniyaga tegishli */
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
