import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { LocationHistory } from './entities/location-history.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(LocationHistory)
    private locationHistoryRepo: Repository<LocationHistory>,
  ) {}

  async findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { phone },
      relations: ['company'],
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['company'],
    });
    if (!user) {
      throw new NotFoundException(`Foydalanuvchi #${id} topilmadi`);
    }
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllByCompany(companyId: string): Promise<User[]> {
    return this.usersRepository.find({
      where: { companyId },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByRole(role: UserRole): Promise<User[]> {
    return this.usersRepository.find({
      where: { role },
      relations: ['company'],
    });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.findByPhone(dto.phone);
    if (existing) {
      throw new ConflictException(
        `Bu telefon raqam allaqachon ro'yxatdan o'tgan: ${dto.phone}`,
      );
    }

    const salt = await bcrypt.genSalt(10);
    const rawPassword = dto.password || '123456';
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    const user = this.usersRepository.create({
      fullName: dto.fullName,
      phone: dto.phone,
      role: dto.role as UserRole,
      companyId: dto.companyId as any,
      status: UserStatus.ACTIVE,
      passwordHash,
    });

    return this.usersRepository.save(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Agar parol o'zgartirilsa, hash qilish
    if (dto.password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(dto.password, salt);
    }

    // Boshqa fieldlarni yangilash
    if (dto.fullName) user.fullName = dto.fullName;
    if (dto.phone) user.phone = dto.phone;
    if (dto.role) user.role = dto.role;
    if (dto.status) user.status = dto.status;
    
    if (dto.companyId !== undefined) {
      // @ts-ignore
      user.companyId = dto.companyId;
    }

    if (dto.currentLocation !== undefined) {
      let newLat: number | null = null;
      let newLng: number | null = null;

      if (typeof dto.currentLocation === 'string' && dto.currentLocation.includes(',')) {
        const [lat, lng] = dto.currentLocation.split(',').map(Number);
        newLat = lat;
        newLng = lng;

        // Geographic validation — O'zbekiston va Markaziy Osiyo mintaqasi (lat 34-46, lng 55-76)
        // Chegaradan tashqaridagi koordinatalarni rad etish (GPS glitch / emulyator)
        if (newLat < 34 || newLat > 46 || newLng < 55 || newLng > 76) {
          console.warn(`[Location] Noto'g'ri koordinata rad etildi: lat=${newLat}, lng=${newLng} (userId=${id})`);
        } else {
          user.currentLocation = `(${lng},${lat})`;
        }
      } else {
        user.currentLocation = dto.currentLocation;
      }

      // Save location history for mileage tracking
      if (newLat && newLng && !isNaN(newLat) && !isNaN(newLng) &&
          newLat >= 34 && newLat <= 46 && newLng >= 55 && newLng <= 76) {
        try {
          // Get last known location for distance calculation
          const lastEntry = await this.locationHistoryRepo.findOne({
            where: { userId: id },
            order: { createdAt: 'DESC' },
          });

          let distance = 0;
          if (lastEntry) {
            distance = this.haversineDistance(
              lastEntry.latitude, lastEntry.longitude,
              newLat, newLng,
            );
            // Ignore unrealistic jumps (> 50km in one update — likely GPS glitch)
            if (distance > 50) distance = 0;
          }

          await this.locationHistoryRepo.save({
            userId: id,
            latitude: newLat,
            longitude: newLng,
            distanceFromPrev: distance,
          });
        } catch (e) {
          console.error('[LocationHistory] Save error:', e.message);
        }
      }
    }

    return this.usersRepository.save(user);
  }

  /**
   * Haversine formula — calculates distance between two GPS points in kilometers
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Get driver mileage report for a date range
   */
  async getDriverMileage(userId: string, from: Date, to: Date) {
    const result = await this.locationHistoryRepo
      .createQueryBuilder('lh')
      .select('SUM(lh.distance_from_prev)', 'totalKm')
      .addSelect('COUNT(lh.id)', 'pointCount')
      .where('lh.user_id = :userId', { userId })
      .andWhere('lh.created_at >= :from', { from })
      .andWhere('lh.created_at <= :to', { to })
      .getRawOne();

    return {
      totalKm: parseFloat(result?.totalKm || '0'),
      pointCount: parseInt(result?.pointCount || '0'),
    };
  }

  /**
   * Get daily breakdown of mileage for a date range
   */
  async getDriverMileageDaily(userId: string, from: Date, to: Date) {
    const results = await this.locationHistoryRepo
      .createQueryBuilder('lh')
      .select("DATE(lh.created_at)", 'date')
      .addSelect('SUM(lh.distance_from_prev)', 'km')
      .addSelect('COUNT(lh.id)', 'points')
      .where('lh.user_id = :userId', { userId })
      .andWhere('lh.created_at >= :from', { from })
      .andWhere('lh.created_at <= :to', { to })
      .groupBy("DATE(lh.created_at)")
      .orderBy("DATE(lh.created_at)", 'ASC')
      .getRawMany();

    return results.map(r => ({
      date: r.date,
      km: parseFloat(r.km || '0'),
      points: parseInt(r.points || '0'),
    }));
  }

  async updatePushToken(id: string, token: string): Promise<void> {
    console.log(`[PushToken] 📱 Saving token for user ${id}: "${token?.substring(0, 30)}..." (length: ${token?.length})`);
    await this.usersRepository.update(id, { expoPushToken: token });
    console.log(`[PushToken] ✅ Token saved successfully for user ${id}`);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    user.status = UserStatus.DELETED;
    await this.usersRepository.save(user);
    await this.usersRepository.softRemove(user);
  }
}
