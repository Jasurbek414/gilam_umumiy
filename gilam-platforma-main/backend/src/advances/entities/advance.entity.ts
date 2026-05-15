import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Company } from '../../companies/entities/company.entity';

@Entity('advances')
export class Advance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: User;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  date: string;

  /** CASH | CARD | OTHER */
  @Column({ name: 'payment_type', type: 'varchar', length: 20, default: 'CASH' })
  paymentType: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ name: 'receipt_url', type: 'varchar', length: 500, nullable: true })
  receiptUrl: string;

  /** Kimdan berilgan (manager ID) */
  @Column({ name: 'given_by', type: 'uuid', nullable: true })
  givenBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'given_by' })
  givenByUser: User;

  @Column({ name: 'is_cancelled', default: false })
  isCancelled: boolean;

  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true })
  cancelledBy: string;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
