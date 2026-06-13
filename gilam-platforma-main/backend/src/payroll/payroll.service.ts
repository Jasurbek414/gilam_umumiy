import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PayrollPeriod, PayrollStatus } from './entities/payroll-period.entity';
import { PayrollItem } from './entities/payroll-item.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { User } from '../users/entities/user.entity';
import { AdvancesService } from '../advances/advances.service';
import { BonusesService } from '../bonuses/bonuses.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(PayrollPeriod)
    private readonly periodRepo: Repository<PayrollPeriod>,
    @InjectRepository(PayrollItem)
    private readonly itemRepo: Repository<PayrollItem>,
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly advancesService: AdvancesService,
    private readonly bonusesService: BonusesService,
    private readonly auditService: AuditService,
  ) {}

  /** Oylik davr uchun ish haqini hisoblash */
  async calculate(companyId: string, year: number, month: number, userId: string, globalRestDay?: string): Promise<PayrollPeriod> {
    // Mavjud periodni tekshirish
    let period = await this.periodRepo.findOne({
      where: { companyId, year, month },
    });

    if (period && period.status === PayrollStatus.APPROVED) {
      throw new ForbiddenException('Bu oy uchun oylik allaqachon tasdiqlangan. Faqat superadmin qayta hisoblashi mumkin.');
    }

    if (!period) {
      period = this.periodRepo.create({ companyId, year, month, status: PayrollStatus.CALCULATING });
      period = await this.periodRepo.save(period);
    } else {
      period.status = PayrollStatus.CALCULATING;
      await this.periodRepo.save(period);
      // Eski itemlarni tozalash
      await this.itemRepo.delete({ periodId: period.id });
    }

    // Sana oralig'i
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    // Kompaniya xodimlari
    const employees = await this.userRepo.find({
      where: { companyId, status: 'ACTIVE' as any },
    });

    let totalAmount = 0;

    for (const emp of employees) {
      // Faqat WORKER, DRIVER, MANAGER, OPERATOR rollari
      if (!['WORKER', 'DRIVER', 'MANAGER', 'OPERATOR', 'COMPANY_ADMIN'].includes(emp.role)) continue;

      const attendances = await this.attendanceRepo.find({
        where: { userId: emp.id, date: Between(startDate, endDate) },
      });

      const advances = await this.advancesService.getEmployeeTotal(emp.id, startDate, endDate);
      const totalBonuses = await this.bonusesService.getEmployeeBonusTotal(emp.id, startDate, endDate);
      const totalPenalties = await this.bonusesService.getEmployeePenaltyTotal(emp.id, startDate, endDate);
      const schedule = emp.workSchedule || 'MONTHLY';

      let baseSalary = 0;
      let workedDays = 0;
      let workedHours = 0;
      let absentDays = 0;
      let deductions = 0;

      if (schedule === 'HOURLY') {
        // Soatlik: har kun ishlagan soat × stavka
        const rate = Number(emp.salary || 0); // soatlik stavka salary da saqlanadi
        attendances.forEach(a => {
          workedHours += Number(a.workedHours || 0);
        });
        baseSalary = Math.round(workedHours * rate);
        workedDays = attendances.filter(a => ['PRESENT', 'HOURLY'].includes(a.status)).length;
      } else if (schedule === 'DAILY') {
        // Kunlik: kelgan kunlar × kunlik stavka
        const rate = Number(emp.salary || 0);
        workedDays = attendances.filter(a => ['PRESENT', 'HOURLY'].includes(a.status)).length;
        const halfDays = attendances.filter(a => a.status === 'HALF_DAY').length;
        baseSalary = Math.round((workedDays + halfDays * 0.5) * rate);
        absentDays = attendances.filter(a => a.status === 'ABSENT').length;
      } else if (schedule === 'WEEKLY') {
        // Haftalik: haftalik maosh × to'liq haftalar
        const rate = Number(emp.salary || 0);
        workedDays = attendances.filter(a => ['PRESENT', 'HOURLY'].includes(a.status)).length;
        const halfDays = attendances.filter(a => a.status === 'HALF_DAY').length;
        const totalWorkDays = workedDays + halfDays * 0.5;
        // 6 kunlik hafta deb hisoblaymiz
        const workDaysPerWeek = 6;
        baseSalary = Math.round((totalWorkDays / workDaysPerWeek) * rate);
        absentDays = attendances.filter(a => a.status === 'ABSENT').length;
      } else {
        // MONTHLY: belgilangan maosh, kelmagan kunlar uchun kamaytirish
        const monthlySalary = Number(emp.salary || 0);
        const dailyRate = monthlySalary / lastDay;
        let penalty = 0;
        let bonus = 0;

        attendances.forEach(a => {
          if (!a.date) return;
          const isOffDay = globalRestDay !== undefined && globalRestDay !== '' && new Date(a.date).getDay() === Number(globalRestDay);
          if (isOffDay) {
            if (a.status === 'PRESENT') bonus += dailyRate;
            if (a.status === 'HALF_DAY') bonus += dailyRate / 2;
          } else {
            if (a.status === 'ABSENT') penalty += dailyRate;
            if (a.status === 'HALF_DAY') penalty += dailyRate / 2;
          }
        });

        baseSalary = Math.round(monthlySalary + bonus);
        deductions = Math.round(penalty);
        workedDays = attendances.filter(a => ['PRESENT', 'HOURLY'].includes(a.status)).length;
        absentDays = attendances.filter(a => a.status === 'ABSENT').length;
      }

      const netPay = Math.max(0, baseSalary - deductions - advances + totalBonuses - totalPenalties);

      const item = this.itemRepo.create({
        periodId: period.id,
        employeeId: emp.id,
        companyId,
        baseSalary,
        salaryType: schedule,
        workedDays,
        workedHours,
        absentDays,
        totalAdvances: advances,
        bonuses: totalBonuses,
        penalties: totalPenalties,
        deductions,
        netPay,
        status: 'CALCULATED',
      });

      await this.itemRepo.save(item);
      totalAmount += netPay;
    }

    period.status = PayrollStatus.REVIEW;
    period.totalAmount = totalAmount;
    await this.periodRepo.save(period);

    await this.auditService.log({
      entityType: 'PAYROLL',
      entityId: period.id,
      action: 'CREATE',
      newData: { year, month, totalAmount, employeeCount: employees.length },
      userId,
      companyId,
    });

    return this.findPeriodWithItems(period.id);
  }

  async findPeriods(companyId: string): Promise<PayrollPeriod[]> {
    return this.periodRepo.find({
      where: { companyId },
      order: { year: 'DESC', month: 'DESC' },
    });
  }

  async findPeriodWithItems(periodId: string): Promise<PayrollPeriod> {
    const period = await this.periodRepo.findOne({
      where: { id: periodId },
      relations: ['items', 'items.employee', 'approvedByUser'],
    });
    if (!period) throw new NotFoundException('Period topilmadi');
    return period;
  }

  async approve(periodId: string, userId: string, companyId: string): Promise<PayrollPeriod> {
    const period = await this.periodRepo.findOne({ where: { id: periodId } });
    if (!period) throw new NotFoundException('Period topilmadi');
    if (period.status === PayrollStatus.APPROVED) throw new ForbiddenException('Allaqachon tasdiqlangan');

    period.status = PayrollStatus.APPROVED;
    period.approvedBy = userId;
    period.approvedAt = new Date();
    await this.periodRepo.save(period);

    // Itemlar statusini yangilash
    await this.itemRepo.update({ periodId }, { status: 'APPROVED' });

    await this.auditService.log({
      entityType: 'PAYROLL',
      entityId: periodId,
      action: 'UPDATE',
      oldData: { status: 'REVIEW' },
      newData: { status: 'APPROVED', approvedBy: userId },
      userId,
      companyId,
    });

    return this.findPeriodWithItems(periodId);
  }

  async markAsPaid(periodId: string, userId: string, companyId: string): Promise<PayrollPeriod> {
    const period = await this.periodRepo.findOne({ where: { id: periodId } });
    if (!period) throw new NotFoundException('Period topilmadi');
    if (period.status !== PayrollStatus.APPROVED) throw new ForbiddenException('Avval tasdiqlang');

    period.status = PayrollStatus.PAID;
    await this.periodRepo.save(period);
    await this.itemRepo.update({ periodId }, { status: 'PAID' });

    await this.auditService.log({
      entityType: 'PAYROLL',
      entityId: periodId,
      action: 'UPDATE',
      oldData: { status: 'APPROVED' },
      newData: { status: 'PAID' },
      userId,
      companyId,
    });

    return this.findPeriodWithItems(periodId);
  }

  /** Xodim bo'yicha balans: hisoblangan - to'langan */
  async getEmployeeBalance(employeeId: string, companyId: string): Promise<{
    totalEarned: number;
    totalAdvances: number;
    totalPaid: number;
    balance: number;
  }> {
    const earned = await this.itemRepo
      .createQueryBuilder('pi')
      .select('COALESCE(SUM(pi.net_pay), 0)', 'total')
      .where('pi.employee_id = :employeeId', { employeeId })
      .andWhere('pi.company_id = :companyId', { companyId })
      .andWhere('pi.status IN (:...statuses)', { statuses: ['APPROVED', 'PAID'] })
      .getRawOne();

    const advances = await this.itemRepo
      .createQueryBuilder('pi')
      .select('COALESCE(SUM(pi.total_advances), 0)', 'total')
      .where('pi.employee_id = :employeeId', { employeeId })
      .andWhere('pi.company_id = :companyId', { companyId })
      .getRawOne();

    const totalEarned = parseFloat(earned?.total || '0');
    const totalAdvances = parseFloat(advances?.total || '0');

    return {
      totalEarned,
      totalAdvances,
      totalPaid: totalAdvances,
      balance: totalEarned - totalAdvances,
    };
  }
}
