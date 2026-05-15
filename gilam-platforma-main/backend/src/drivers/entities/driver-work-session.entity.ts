import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Company } from '../../companies/entities/company.entity';

@Entity('driver_work_sessions')
export class DriverWorkSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: User;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'started_at', type: 'timestamp' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt: Date;

  @Column({ name: 'start_latitude', type: 'double precision', nullable: true })
  startLatitude: number;

  @Column({ name: 'start_longitude', type: 'double precision', nullable: true })
  startLongitude: number;

  @Column({ name: 'end_latitude', type: 'double precision', nullable: true })
  endLatitude: number;

  @Column({ name: 'end_longitude', type: 'double precision', nullable: true })
  endLongitude: number;

  /** ACTIVE | COMPLETED | FORCE_ENDED */
  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'offline_reason', type: 'varchar', length: 50, nullable: true })
  offlineReason: string;

  @Column({ name: 'total_online_minutes', type: 'int', default: 0 })
  totalOnlineMinutes: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
