import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
  ) {}

  async create(data: Partial<Expense>): Promise<Expense> {
    const expense = this.expenseRepository.create(data);
    return this.expenseRepository.save(expense);
  }

  async findAllByCompany(companyId: string, startDate?: string, endDate?: string): Promise<Expense[]> {
    const query = this.expenseRepository.createQueryBuilder('expense')
      .where('expense.companyId = :companyId', { companyId })
      .orderBy('expense.date', 'DESC')
      .addOrderBy('expense.createdAt', 'DESC');

    if (startDate) {
      query.andWhere('expense.date >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('expense.date <= :endDate', { endDate });
    }

    return query.getMany();
  }

  async findAllByUser(userId: string): Promise<Expense[]> {
    return this.expenseRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });
  }

  async remove(id: string): Promise<void> {
    const expense = await this.expenseRepository.findOne({ where: { id } });
    if (!expense) throw new NotFoundException('Expense not found');
    await this.expenseRepository.remove(expense);
  }

  async update(id: string, data: Partial<Expense>): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({ where: { id } });
    if (!expense) throw new NotFoundException('Expense not found');
    Object.assign(expense, data);
    return this.expenseRepository.save(expense);
  }
}
