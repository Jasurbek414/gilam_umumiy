import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bonus } from './entities/bonus.entity';
import { Penalty } from './entities/penalty.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class BonusesService {
  constructor(
    @InjectRepository(Bonus)
    private readonly bonusRepo: Repository<Bonus>,
    @InjectRepository(Penalty)
    private readonly penaltyRepo: Repository<Penalty>,
    private readonly auditService: AuditService,
  ) {}

  // ---- BONUSES ----
  async createBonus(data: Partial<Bonus>, userId?: string): Promise<Bonus> {
    const bonus = this.bonusRepo.create({ ...data, createdBy: userId });
    const saved = await this.bonusRepo.save(bonus);
    await this.auditService.log({
      entityType: 'BONUS', entityId: saved.id, action: 'CREATE',
      newData: { employeeId: saved.employeeId, amount: saved.amount, reason: saved.reason },
      userId, companyId: saved.companyId,
    });
    return (await this.bonusRepo.findOne({ where: { id: saved.id }, relations: ['employee'] }))!;
  }

  async findBonusesByEmployee(employeeId: string): Promise<Bonus[]> {
    return this.bonusRepo.find({
      where: { employeeId },
      relations: ['createdByUser'],
      order: { date: 'DESC' },
    });
  }

  async findBonusesByCompany(companyId: string): Promise<Bonus[]> {
    return this.bonusRepo.find({
      where: { companyId },
      relations: ['employee', 'createdByUser'],
      order: { date: 'DESC' },
    });
  }

  // ---- PENALTIES ----
  async createPenalty(data: Partial<Penalty>, userId?: string): Promise<Penalty> {
    const penalty = this.penaltyRepo.create({ ...data, createdBy: userId });
    const saved = await this.penaltyRepo.save(penalty);
    await this.auditService.log({
      entityType: 'PENALTY', entityId: saved.id, action: 'CREATE',
      newData: { employeeId: saved.employeeId, amount: saved.amount, reason: saved.reason },
      userId, companyId: saved.companyId,
    });
    return (await this.penaltyRepo.findOne({ where: { id: saved.id }, relations: ['employee'] }))!;
  }

  async findPenaltiesByEmployee(employeeId: string): Promise<Penalty[]> {
    return this.penaltyRepo.find({
      where: { employeeId },
      relations: ['createdByUser'],
      order: { date: 'DESC' },
    });
  }

  async findPenaltiesByCompany(companyId: string): Promise<Penalty[]> {
    return this.penaltyRepo.find({
      where: { companyId },
      relations: ['employee', 'createdByUser'],
      order: { date: 'DESC' },
    });
  }

  async getEmployeeBonusTotal(employeeId: string, startDate: string, endDate: string): Promise<number> {
    const result = await this.bonusRepo
      .createQueryBuilder('b')
      .select('COALESCE(SUM(b.amount), 0)', 'total')
      .where('b.employee_id = :employeeId', { employeeId })
      .andWhere('b.date >= :startDate', { startDate })
      .andWhere('b.date <= :endDate', { endDate })
      .getRawOne();
    return parseFloat(result?.total || '0');
  }

  async getEmployeePenaltyTotal(employeeId: string, startDate: string, endDate: string): Promise<number> {
    const result = await this.penaltyRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where('p.employee_id = :employeeId', { employeeId })
      .andWhere('p.date >= :startDate', { startDate })
      .andWhere('p.date <= :endDate', { endDate })
      .getRawOne();
    return parseFloat(result?.total || '0');
  }
}
