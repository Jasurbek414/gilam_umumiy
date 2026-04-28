import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'varchar', length: 20, default: 'EXPENSE' })
  type: string;

  @Column({ type: 'uuid', nullable: true })
  orderId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column()
  category: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'date' })
  date: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  companyId: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
