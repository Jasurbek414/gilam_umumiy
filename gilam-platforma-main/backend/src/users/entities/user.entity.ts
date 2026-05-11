import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  OPERATOR = 'OPERATOR',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  DRIVER = 'DRIVER',
  MANAGER = 'MANAGER',
  WORKER = 'WORKER',
  CUSTOMER = 'CUSTOMER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OFFLINE = 'OFFLINE',
  DELETED = 'DELETED',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string;

  @ManyToOne(() => Company, (company) => company.users, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  @Column({ unique: true, length: 50 })
  phone: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'point', name: 'current_location', nullable: true })
  currentLocation: any; // Using basic simple type for now, can be string or PostGIS Point

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ name: 'expo_push_token', nullable: true })
  expoPushToken: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: Date | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, default: 0 })
  salary: number;

  @Column({ name: 'work_schedule', type: 'varchar', length: 20, nullable: true, default: 'MONTHLY' })
  workSchedule: string;

  @Column({ name: 'lunch_break_minutes', type: 'int', nullable: true, default: 60 })
  lunchBreakMinutes: number;

  @Column({ name: 'birth_place', type: 'varchar', length: 255, nullable: true })
  birthPlace: string | null;

  @Column({ name: 'photo_url', type: 'varchar', length: 500, nullable: true })
  photoUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
