import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

@Entity('sip_configs')
export class SipConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  provider: string;

  @Column()
  login: string;

  @Column({ select: false }) // Don't return password in normal queries
  password: string;

  @Column()
  server: string;

  @Column({ default: 'OFFLINE' })
  status: string;

  @ManyToOne(() => Company)
  company: Company;

  @Column()
  companyId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
