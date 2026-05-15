import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';
import { PayrollItem } from './payroll-item.entity';

export enum PayrollStatus {
  PENDING = 'PENDING',
  CALCULATING = 'CALCULATING',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

@Entity('payroll_periods')
export class PayrollPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  branch: string;

  @Column({ type: 'enum', enum: PayrollStatus, default: PayrollStatus.PENDING })
  status: PayrollStatus;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedByUser: User;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ name: 'total_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalAmount: number;

  @OneToMany(() => PayrollItem, (item) => item.period)
  items: PayrollItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
