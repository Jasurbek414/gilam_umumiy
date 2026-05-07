import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Attendance } from './entities/attendance.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepo: Repository<Attendance>,
  ) {}

  async createOrUpdate(data: Partial<Attendance>) {
    // Agar o'sha kunga allaqachon davomat bo'lsa, yangilash
    const existing = await this.attendanceRepo.findOne({
      where: { companyId: data.companyId, userId: data.userId, date: data.date }
    });

    if (existing) {
      if (data.status !== undefined) existing.status = data.status;
      if (data.calculatedSalary !== undefined) existing.calculatedSalary = data.calculatedSalary;
      if (data.comment !== undefined) existing.comment = data.comment;
      if (data.startTime !== undefined) existing.startTime = data.startTime;
      if (data.endTime !== undefined) existing.endTime = data.endTime;
      if (data.workedHours !== undefined) existing.workedHours = data.workedHours;
      return this.attendanceRepo.save(existing);
    }
    
    const newRecord = this.attendanceRepo.create(data);
    return this.attendanceRepo.save(newRecord);
  }

  async findByCompany(companyId: string, startDate: string, endDate: string) {
    return this.attendanceRepo.find({
      where: {
        companyId,
        date: Between(startDate, endDate),
      },
      relations: ['user'],
      order: { date: 'DESC' },
    });
  }

  async findByUser(userId: string, startDate: string, endDate: string) {
    return this.attendanceRepo.find({
      where: {
        userId,
        date: Between(startDate, endDate),
      },
      order: { date: 'DESC' },
    });
  }

  async remove(id: string) {
    const record = await this.attendanceRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Topilmadi');
    return this.attendanceRepo.remove(record);
  }
}
