import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Company } from '../../companies/entities/company.entity';

@Entity('customer_addresses')
export class CustomerAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  /** Operator yozgan manzil matni */
  @Column({ name: 'address_text', type: 'text', nullable: true })
  addressText: string;

  /** Geocoder qaytargan formatlangan manzil */
  @Column({ name: 'formatted_address', type: 'text', nullable: true })
  formattedAddress: string;

  @Column({ type: 'double precision', nullable: true })
  latitude: number;

  @Column({ type: 'double precision', nullable: true })
  longitude: number;

  @Column({ name: 'place_id', type: 'varchar', length: 255, nullable: true })
  placeId: string;

  @Column({ name: 'confirmed_by_operator', default: false })
  confirmedByOperator: boolean;

  @Column({ name: 'confirmed_by', type: 'uuid', nullable: true })
  confirmedBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'confirmed_by' })
  confirmedByUser: User;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
