import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Company } from '../../companies/entities/company.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'recipient_id', type: 'uuid' })
  recipientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
