import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { OrderItem } from './order-item.entity';
import { FacilityStage } from './facility-stage.entity';

export enum OrderStatus {
  NEW = 'NEW',
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  AT_FACILITY = 'AT_FACILITY',
  WASHING = 'WASHING',
  DRYING = 'DRYING',
  FINISHED = 'FINISHED',
  READY_FOR_DELIVERY = 'READY_FOR_DELIVERY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'operator_id', type: 'uuid', nullable: true })
  operatorId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'operator_id' })
  operator: User;

  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driver_id' })
  driver: User;

  @Column({ name: 'facility_stage_id', type: 'uuid', nullable: true })
  facilityStageId: string;

  @ManyToOne(() => FacilityStage, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'facility_stage_id' })
  facilityStage: FacilityStage;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.NEW })
  status: OrderStatus;

  @Column({
    type: 'decimal',
    name: 'total_amount',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalAmount: number;

  @Column({
    type: 'decimal',
    name: 'paid_amount',
    precision: 12,
    scale: 2,
    default: 0,
  })
  paidAmount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    name: 'payment_status',
    default: PaymentStatus.UNPAID,
  })
  paymentStatus: PaymentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @Column({ name: 'deadline_date', type: 'timestamp', nullable: true })
  deadlineDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
