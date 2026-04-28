import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';
import { User } from '../../users/entities/user.entity';

@Entity('order_actions')
export class OrderAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  action: string; // The status it was moved to or the manual stage added

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
