import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';
import { User } from '../../users/entities/user.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Order } from '../../orders/entities/order.entity';

export enum CallStatus {
  RINGING = 'RINGING',
  ANSWERED = 'ANSWERED',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
  REJECTED = 'REJECTED',
}

export enum CallDirection {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
}

@Entity('calls')
export class Call {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId: string;

  @ManyToOne(() => Campaign, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column({ name: 'operator_id', type: 'uuid', nullable: true })
  operatorId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'operator_id' })
  operator: User;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'caller_phone', length: 50 })
  callerPhone: string;

  @Column({ name: 'called_phone', length: 50, nullable: true })
  calledPhone: string;

  @Column({
    type: 'enum',
    enum: CallDirection,
    default: CallDirection.INCOMING,
  })
  direction: CallDirection;

  @Column({ type: 'enum', enum: CallStatus, default: CallStatus.RINGING })
  status: CallStatus;

  @Column({ name: 'sip_call_id', length: 255, nullable: true })
  sipCallId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'duration_seconds', type: 'int', default: 0 })
  durationSeconds: number;

  @Column({ name: 'recording_url', type: 'text', nullable: true })
  recordingUrl: string;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date;

  @Column({ name: 'answered_at', type: 'timestamptz', nullable: true })
  answeredAt: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
