import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Advance } from './entities/advance.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdvancesService {
  constructor(
    @InjectRepository(Advance)
    private readonly advanceRepo: Repository<Advance>,
    private readonly auditService: AuditService,
  ) {}

  async create(data: Partial<Advance>, userId?: string): Promise<Advance> {
    const advance = this.advanceRepo.create({
      ...data,
      date: data.date || new Date().toISOString().split('T')[0],
      givenBy: data.givenBy || userId,
    });
    const saved = await this.advanceRepo.save(advance);

    await this.auditService.log({
      entityType: 'ADVANCE',
      entityId: saved.id,
      action: 'CREATE',
      newData: { employeeId: saved.employeeId, amount: saved.amount, paymentType: saved.paymentType, comment: saved.comment },
      userId,
      companyId: saved.companyId,
    });

    return (await this.advanceRepo.findOne({
      where: { id: saved.id },
      relations: ['employee', 'givenByUser'],
    }))!;
  }

  async findByCompany(companyId: string, startDate?: string, endDate?: string): Promise<Advance[]> {
    const query = this.advanceRepo.createQueryBuilder('a')
      .leftJoinAndSelect('a.employee', 'employee')
      .leftJoinAndSelect('a.givenByUser', 'givenBy')
      .where('a.company_id = :companyId', { companyId })
      .orderBy('a.date', 'DESC')
      .addOrderBy('a.created_at', 'DESC');

    if (startDate) query.andWhere('a.date >= :startDate', { startDate });
    if (endDate) query.andWhere('a.date <= :endDate', { endDate });

    return query.getMany();
  }

  async findByEmployee(employeeId: string, startDate?: string, endDate?: string): Promise<Advance[]> {
    const where: any = { employeeId, isCancelled: false };
    if (startDate && endDate) {
      where.date = Between(startDate, endDate);
    }
    return this.advanceRepo.find({
      where,
      relations: ['givenByUser'],
      order: { date: 'DESC' },
    });
  }

  async getEmployeeTotal(employeeId: string, startDate: string, endDate: string): Promise<number> {
    const result = await this.advanceRepo
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.amount), 0)', 'total')
      .where('a.employee_id = :employeeId', { employeeId })
      .andWhere('a.is_cancelled = false')
      .andWhere('a.date >= :startDate', { startDate })
      .andWhere('a.date <= :endDate', { endDate })
      .getRawOne();
    return parseFloat(result?.total || '0');
  }

  async cancel(id: string, userId: string, companyId: string): Promise<Advance> {
    const advance = await this.advanceRepo.findOne({ where: { id }, relations: ['employee'] });
    if (!advance) throw new NotFoundException('Avans topilmadi');
    if (advance.isCancelled) throw new ForbiddenException('Bu avans allaqachon bekor qilingan');

    const oldData = { amount: advance.amount, isCancelled: false };
    advance.isCancelled = true;
    advance.cancelledBy = userId;
    advance.cancelledAt = new Date();
    const saved = await this.advanceRepo.save(advance);

    await this.auditService.log({
      entityType: 'ADVANCE',
      entityId: id,
      action: 'UPDATE',
      oldData,
      newData: { isCancelled: true, cancelledBy: userId },
      userId,
      companyId,
    });

    return saved;
  }
}
