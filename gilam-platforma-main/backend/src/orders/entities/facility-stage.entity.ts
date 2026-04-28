import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('facility_stages')
export class FacilityStage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column()
  name: string;

  @Column({ nullable: true, default: 'build' })
  icon: string;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @Column({ name: 'status_filter', type: 'varchar', nullable: true, default: null })
  statusFilter: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
