import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  HALF_DAY = 'HALF_DAY',
  HOURLY = 'HOURLY',
}

@Entity('attendance')
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  status: AttendanceStatus;

  @Column({ type: 'time', nullable: true, name: 'start_time' })
  startTime: string;

  @Column({ type: 'time', nullable: true, name: 'end_time' })
  endTime: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, default: 0, name: 'worked_hours' })
  workedHours: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  calculatedSalary: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ name: 'lunch_minutes', type: 'int', nullable: true, default: 60 })
  lunchMinutes: number;

  @Column({ name: 'late_minutes', type: 'int', nullable: true, default: 0 })
  lateMinutes: number;

  @Column({ name: 'early_leave_minutes', type: 'int', nullable: true, default: 0 })
  earlyLeaveMinutes: number;

  @Column({ name: 'overtime_hours', type: 'decimal', precision: 5, scale: 2, nullable: true, default: 0 })
  overtimeHours: number;

  /** EXCUSED | UNEXCUSED | null */
  @Column({ name: 'absence_reason', type: 'varchar', length: 20, nullable: true })
  absenceReason: string;

  /** Manager kim belgilagan */
  @Column({ name: 'marked_by', type: 'uuid', nullable: true })
  markedBy: string;

  @Column({ name: 'attachment_url', type: 'varchar', length: 500, nullable: true })
  attachmentUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
