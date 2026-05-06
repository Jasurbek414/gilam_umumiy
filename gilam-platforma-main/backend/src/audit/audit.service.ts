import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditLogInput {
  entityType: string;
  entityId: string;
  action: string;   // CREATE | UPDATE | DELETE
  oldData?: any;
  newData?: any;
  userId?: string;
  companyId: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Yangi audit log yozuvi qo'shish.
   * Har qanday entity o'zgartirilganda chaqiriladi.
   */
  async log(input: AuditLogInput): Promise<AuditLog> {
    const entry = this.auditLogRepository.create({
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      oldData: input.oldData || null,
      newData: input.newData || null,
      userId: input.userId || null,
      companyId: input.companyId,
    });
    return this.auditLogRepository.save(entry);
  }

  /**
   * Kompaniya bo'yicha barcha audit loglarni olish.
   * Eng oxirgi o'zgarishlar birinchi.
   */
  async findByCompany(companyId: string, entityType?: string, limit = 100): Promise<AuditLog[]> {
    const query = this.auditLogRepository.createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where('log.companyId = :companyId', { companyId })
      .orderBy('log.createdAt', 'DESC')
      .take(limit);

    if (entityType) {
      query.andWhere('log.entityType = :entityType', { entityType });
    }

    return query.getMany();
  }

  /**
   * Muayyan entity uchun barcha tarix (o'zgarishlar zanjiri).
   */
  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { entityType, entityId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }
}
