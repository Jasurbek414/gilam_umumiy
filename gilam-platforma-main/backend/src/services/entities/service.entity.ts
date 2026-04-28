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

export enum MeasurementUnit {
  SQM = 'SQM',
  KG = 'KG',
  METER = 'METER',
  CM = 'CM',
  PIECE = 'PIECE',
  SET = 'SET',
  HOUR = 'HOUR',
  FIXED = 'FIXED',
}

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'enum', enum: MeasurementUnit, name: 'measurement_unit' })
  measurementUnit: MeasurementUnit;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
