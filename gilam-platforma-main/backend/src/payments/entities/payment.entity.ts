import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Company } from '../../companies/entities/company.entity';

@Entity('payments')
export class Payment {
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

  /** CASH | CARD | TRANSFER | OTHER */
  @Column({ name: 'payment_type', type: 'varchar', length: 20, default: 'CASH' })
  paymentType: string;

  @Column({ name: 'paid_by', type: 'uuid', nullable: true })
  paidBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'paid_by' })
  paidByUser: User;

  @Column({ type: 'text', nullable: true })
  comment: string;

  /** COMPLETED | CANCELLED */
  @Column({ type: 'varchar', length: 20, default: 'COMPLETED' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
