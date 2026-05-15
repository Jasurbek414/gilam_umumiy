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
}
