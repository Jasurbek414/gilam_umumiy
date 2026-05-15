import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PayrollPeriod } from './payroll-period.entity';
import { User } from '../../users/entities/user.entity';
import { Company } from '../../companies/entities/company.entity';

@Entity('payroll_items')
export class PayrollItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'period_id', type: 'uuid' })
  periodId: string;

  @ManyToOne(() => PayrollPeriod, (period) => period.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'period_id' })
  period: PayrollPeriod;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: User;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  /** Asosiy maosh */
  @Column({ name: 'base_salary', type: 'decimal', precision: 12, scale: 2, default: 0 })
  baseSalary: number;

  /** Maosh turi: HOURLY | DAILY | WEEKLY | MONTHLY */
  @Column({ name: 'salary_type', type: 'varchar', length: 20 })
  salaryType: string;

  @Column({ name: 'worked_days', type: 'decimal', precision: 8, scale: 2, default: 0 })
  workedDays: number;

  @Column({ name: 'worked_hours', type: 'decimal', precision: 8, scale: 2, default: 0 })
  workedHours: number;

  @Column({ name: 'absent_days', type: 'int', default: 0 })
  absentDays: number;

  @Column({ name: 'excused_absent_days', type: 'int', default: 0 })
  excusedAbsentDays: number;

  @Column({ name: 'total_advances', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAdvances: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  bonuses: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  penalties: number;

  /** Ushlab qolish (sababsiz kelmagan kunlar uchun) */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  deductions: number;

  /** Yakuniy to'lov: baseSalary - deductions - advances + bonuses - penalties */
  @Column({ name: 'net_pay', type: 'decimal', precision: 12, scale: 2, default: 0 })
  netPay: number;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
