import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  companyId: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  title: string;

  @Column()
  text: string;

  // order | system | payment | security
  @Column({ default: 'system' })
  type: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
