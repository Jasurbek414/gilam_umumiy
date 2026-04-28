import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { LocationHistory } from './entities/location-history.entity';

@Injectable()
export class LocationCleanupService {
  private readonly logger = new Logger(LocationCleanupService.name);

  constructor(
    @InjectRepository(LocationHistory)
    private readonly locationHistoryRepo: Repository<LocationHistory>,
  ) {}

  // Har kuni tunda 03:00 da ishga tushadi
  @Cron('0 3 * * *')
  async cleanupOldLocationHistory() {
    this.logger.log('Eski lokatsiya tarixini tozalash boshlandi...');

    // 90 kundan eski yozuvlarni o'chirish
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    try {
      const result = await this.locationHistoryRepo.delete({
        createdAt: LessThan(cutoffDate),
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(`${result.affected} ta eski lokatsiya yozuvi o'chirildi (90 kundan eski)`);
      } else {
        this.logger.log('Tozalash uchun eski yozuvlar topilmadi');
      }
    } catch (error) {
      this.logger.error('Lokatsiya tozalashda xatolik:', error.message);
    }
  }
}
