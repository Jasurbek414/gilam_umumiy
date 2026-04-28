import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Service } from '../../services/entities/service.entity';
import { User } from '../../users/entities/user.entity';

export enum OrderItemStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  READY = 'READY',
}

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'service_id', type: 'uuid' })
  serviceId: string;

  @ManyToOne(() => Service, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @Column({ unique: true, nullable: true })
  barcode: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  width: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  length: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', name: 'total_price', precision: 12, scale: 2 })
  totalPrice: number;

  @Column({
    type: 'enum',
    enum: OrderItemStatus,
    default: OrderItemStatus.PENDING,
  })
  status: OrderItemStatus;

  @Column({ name: 'worker_id', type: 'uuid', nullable: true })
  workerId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'worker_id' })
  worker: User;

  @Column({ name: 'finisher_id', type: 'uuid', nullable: true })
  finisherId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'finisher_id' })
  finisher: User;
}
