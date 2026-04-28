import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';

export enum CampaignStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ length: 255 })
  name: string;

  // Kampaniyaning asosiy DID raqami (Zadarma / SIP trunk'dan olingan)
  @Column({ name: 'phone_number', length: 50 })
  phoneNumber: string;

  // Qo'shimcha raqamlar (bir kampaniyaga bir nechta DID ulanishi mumkin)
  @Column({ name: 'extra_numbers', type: 'jsonb', default: '[]' })
  extraNumbers: string[];

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.ACTIVE,
  })
  status: CampaignStatus;

  // Kampaniyaning tayinlangan haydovchisi — barcha buyurtmalar shunga ketadi
  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId: string | undefined;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'driver_id' })
  driver: User;

  // Kampaniyaga biriktirilgan operatorlar (barcha kampaniyalar barcha operatorlarga ketadi)
  @ManyToMany(() => User, { eager: true })
  @JoinTable({
    name: 'campaign_operators',
    joinColumn: { name: 'campaign_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'operator_id', referencedColumnName: 'id' },
  })
  operators: User[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
