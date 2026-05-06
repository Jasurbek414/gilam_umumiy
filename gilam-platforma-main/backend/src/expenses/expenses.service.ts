import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    private readonly auditService: AuditService,
  ) {}

  async create(data: Partial<Expense>, userId?: string): Promise<Expense> {
    const expense = this.expenseRepository.create(data);
    const saved = await this.expenseRepository.save(expense);

    // Audit log: CREATE
    if (saved.companyId) {
      await this.auditService.log({
        entityType: 'EXPENSE',
        entityId: saved.id,
        action: 'CREATE',
        newData: { title: saved.title, amount: saved.amount, category: saved.category, comment: saved.comment },
        userId: userId || saved.userId,
        companyId: saved.companyId,
      });
    }

    return saved;
  }

  async findAllByCompany(companyId: string, startDate?: string, endDate?: string): Promise<Expense[]> {
    const query = this.expenseRepository.createQueryBuilder('expense')
      .where('expense.companyId = :companyId', { companyId })
      .andWhere('expense.isDeleted = false')
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
      where: { userId, isDeleted: false },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Soft delete: ma'lumotni bazadan o'chirmaydi, faqat isDeleted=true qo'yadi.
   * Eski qiymatni audit logga yozadi.
   */
  async remove(id: string, userId?: string): Promise<void> {
    const expense = await this.expenseRepository.findOne({ where: { id } });
    if (!expense) throw new NotFoundException('Expense not found');

    // Audit log: DELETE
    await this.auditService.log({
      entityType: 'EXPENSE',
      entityId: id,
      action: 'DELETE',
      oldData: {
        title: expense.title,
        amount: expense.amount,
        category: expense.category,
        comment: expense.comment,
        type: expense.type,
        date: expense.date,
      },
      userId: userId || undefined,
      companyId: expense.companyId,
    });

    // Soft delete
    expense.isDeleted = true;
    expense.deletedAt = new Date();
    expense.deletedBy = userId || undefined;
    await this.expenseRepository.save(expense);
  }

  /**
   * Tahrirlash: eski va yangi qiymatlarni audit logga yozadi.
   */
  async update(id: string, data: Partial<Expense>, userId?: string): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({ where: { id } });
    if (!expense) throw new NotFoundException('Expense not found');

    // Audit log: UPDATE — eski va yangi qiymatlar
    const oldData: any = {};
    const newData: any = {};
    for (const key of ['title', 'amount', 'category', 'comment', 'type', 'date']) {
      if (data[key] !== undefined && data[key] !== expense[key]) {
        oldData[key] = expense[key];
        newData[key] = data[key];
      }
    }

    if (Object.keys(oldData).length > 0) {
      await this.auditService.log({
        entityType: 'EXPENSE',
        entityId: id,
        action: 'UPDATE',
        oldData,
        newData,
        userId: userId || undefined,
        companyId: expense.companyId,
      });
    }

    Object.assign(expense, data);
    return this.expenseRepository.save(expense);
  }
}
