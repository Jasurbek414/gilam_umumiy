import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum CompanyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'phone_number', length: 50, nullable: true })
  phoneNumber: string;

  @Column({ type: 'jsonb', name: 'sip_credentials', nullable: true })
  sipCredentials: any;

  @Column({ type: 'enum', enum: CompanyStatus, default: CompanyStatus.ACTIVE })
  status: CompanyStatus;

  @Column({ name: 'subscription_end_date', type: 'date', nullable: true })
  subscriptionEndDate: Date;

  @OneToMany(() => User, (user) => user.company)
  users: User[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
