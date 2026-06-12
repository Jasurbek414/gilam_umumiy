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

  @Column({ 
    type: 'point', 
    name: 'current_location', 
    nullable: true,
    transformer: {
      from: (value) => value,
      to: (value) => {
        if (!value) return value;
        if (typeof value === 'object' && 'x' in value && 'y' in value) {
          return `${value.x},${value.y}`;
        }
        if (typeof value === 'string') {
          return value.replace('(', '').replace(')', '');
        }
        return value;
      }
    }
  })
  currentLocation: any;

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

  @Column({ name: 'father_name', type: 'varchar', length: 255, nullable: true })
  fatherName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  branch: string | null;

  @Column({ name: 'position_title', type: 'varchar', length: 100, nullable: true })
  positionTitle: string | null;

  @Column({ name: 'hire_date', type: 'date', nullable: true })
  hireDate: Date | null;

  @Column({ name: 'hourly_rate', type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  hourlyRate: number;

  @Column({ name: 'daily_rate', type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  dailyRate: number;

  @Column({ name: 'weekly_rate', type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  weeklyRate: number;

  // ── Driver tracking fields ──
  @Column({ name: 'is_online', default: false })
  isOnline: boolean;

  @Column({ name: 'last_seen_at', type: 'timestamp', nullable: true })
  lastSeenAt: Date;

  @Column({ name: 'vehicle_number', type: 'varchar', length: 20, nullable: true })
  vehicleNumber: string;

  @Column({ name: 'last_accuracy', type: 'double precision', nullable: true })
  lastAccuracy: number;

  @Column({ name: 'last_speed', type: 'double precision', nullable: true })
  lastSpeed: number;

  @Column({ name: 'last_heading', type: 'double precision', nullable: true })
  lastHeading: number;

  @Column({ name: 'location_permission', type: 'varchar', length: 20, nullable: true })
  locationPermission: string;

  @Column({ name: 'device_info', type: 'jsonb', nullable: true })
  deviceInfo: any;

  @Column({ name: 'battery_level', type: 'int', nullable: true })
  batteryLevel: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
