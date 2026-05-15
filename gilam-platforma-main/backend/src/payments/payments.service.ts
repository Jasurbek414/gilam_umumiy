import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly auditService: AuditService,
  ) {}

  async create(data: Partial<Payment>, userId?: string): Promise<Payment> {
    const payment = this.paymentRepo.create({
      ...data,
      date: data.date || new Date().toISOString().split('T')[0],
      paidBy: data.paidBy || userId,
    });
    const saved = await this.paymentRepo.save(payment);

    await this.auditService.log({
      entityType: 'PAYMENT',
      entityId: saved.id,
      action: 'CREATE',
      newData: { employeeId: saved.employeeId, amount: saved.amount, paymentType: saved.paymentType },
      userId,
      companyId: saved.companyId,
    });

    return (await this.paymentRepo.findOne({
      where: { id: saved.id },
      relations: ['employee', 'paidByUser'],
    }))!;
  }

  async findByCompany(companyId: string, startDate?: string, endDate?: string): Promise<Payment[]> {
    const query = this.paymentRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.employee', 'employee')
      .leftJoinAndSelect('p.paidByUser', 'paidBy')
      .where('p.company_id = :companyId', { companyId })
      .andWhere('p.status != :cancelled', { cancelled: 'CANCELLED' })
      .orderBy('p.date', 'DESC');

    if (startDate) query.andWhere('p.date >= :startDate', { startDate });
    if (endDate) query.andWhere('p.date <= :endDate', { endDate });

    return query.getMany();
  }

  async findByEmployee(employeeId: string): Promise<Payment[]> {
    return this.paymentRepo.find({
      where: { employeeId, status: 'COMPLETED' },
      relations: ['paidByUser'],
      order: { date: 'DESC' },
    });
  }
}
