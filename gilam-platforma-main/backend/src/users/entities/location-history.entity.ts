import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('location_history')
export class LocationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  @Column({ type: 'float', name: 'distance_from_prev', default: 0 })
  distanceFromPrev: number; // km

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
