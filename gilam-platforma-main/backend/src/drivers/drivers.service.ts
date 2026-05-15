import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, In, MoreThan } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { DriverWorkSession } from './entities/driver-work-session.entity';
import { CustomerAddress } from './entities/customer-address.entity';
import { LocationHistory } from '../users/entities/location-history.entity';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(DriverWorkSession) private readonly sessionRepo: Repository<DriverWorkSession>,
    @InjectRepository(CustomerAddress) private readonly addressRepo: Repository<CustomerAddress>,
    @InjectRepository(LocationHistory) private readonly locationRepo: Repository<LocationHistory>,
  ) {}

  // ── GO ONLINE ──
  async goOnline(driverId: string, lat?: number, lng?: number): Promise<DriverWorkSession> {
    const driver = await this.userRepo.findOne({ where: { id: driverId, role: UserRole.DRIVER } });
    if (!driver) throw new NotFoundException('Haydovchi topilmadi');

    driver.isOnline = true;
    driver.lastSeenAt = new Date();
    driver.status = 'ACTIVE' as any;
    await this.userRepo.save(driver);

    // Faol sessiya bormi?
    const active = await this.sessionRepo.findOne({
      where: { driverId, status: 'ACTIVE' },
    });
    if (active) return active;

    const session = this.sessionRepo.create({
      driverId,
      companyId: driver.companyId,
      startedAt: new Date(),
      startLatitude: lat,
      startLongitude: lng,
      status: 'ACTIVE',
    });
    return this.sessionRepo.save(session);
  }

  // ── GO OFFLINE ──
  async goOffline(driverId: string, reason?: string, lat?: number, lng?: number): Promise<DriverWorkSession | null> {
    const driver = await this.userRepo.findOne({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Haydovchi topilmadi');

    driver.isOnline = false;
    driver.status = 'OFFLINE' as any;
    await this.userRepo.save(driver);

    const session = await this.sessionRepo.findOne({
      where: { driverId, status: 'ACTIVE' },
    });
    if (session) {
      session.endedAt = new Date();
      session.endLatitude = lat as any;
      session.endLongitude = lng as any;
      session.offlineReason = reason || 'MANUAL';
      session.status = 'COMPLETED';
      const mins = Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60000);
      session.totalOnlineMinutes = mins;
      return this.sessionRepo.save(session);
    }
    return null;
  }

  // ── UPDATE LOCATION ──
  async updateLocation(driverId: string, data: {
    latitude: number; longitude: number; accuracy?: number;
    speed?: number; heading?: number; battery?: number; isMock?: boolean;
  }) {
    const driver = await this.userRepo.findOne({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Haydovchi topilmadi');

    // GPS sakrash tekshiruvi
    if (driver.currentLocation) {
      const oldLat = this.extractLat(driver.currentLocation);
      const oldLng = this.extractLng(driver.currentLocation);
      if (oldLat && oldLng) {
        const dist = this.haversine(oldLat, oldLng, data.latitude, data.longitude);
        if (dist > 50) {
          this.logger.warn(`[GPS] Sakrash: ${dist.toFixed(1)}km, driver=${driverId}`);
          return { accepted: false, reason: 'GPS_JUMP' };
        }
      }
    }

    // Mock location ogohlantirishi
    if (data.isMock) {
      this.logger.warn(`[GPS] Mock location: driver=${driverId}`);
    }

    // Accuracy tekshiruvi
    if (data.accuracy && data.accuracy > 100) {
      return { accepted: false, reason: 'LOW_ACCURACY' };
    }

    // User yangilash
    driver.currentLocation = `(${data.longitude},${data.latitude})`;
    driver.lastSeenAt = new Date();
    driver.lastAccuracy = (data.accuracy ?? null) as any;
    driver.lastSpeed = (data.speed ?? null) as any;
    driver.lastHeading = (data.heading ?? null) as any;
    driver.batteryLevel = (data.battery ?? null) as any;
    await this.userRepo.save(driver);

    // Log saqlash
    await this.locationRepo.save({
      userId: driverId,
      latitude: data.latitude,
      longitude: data.longitude,
      distanceFromPrev: 0, // calculated separately
    });

    return {
      accepted: true,
      isMock: data.isMock || false,
      lowAccuracy: data.accuracy && data.accuracy > 50,
    };
  }

  // ── LIVE DRIVERS ──
  async getLiveDrivers(companyId?: string) {
    const where: any = { role: UserRole.DRIVER, isOnline: true };
    if (companyId) where.companyId = companyId;

    return this.userRepo.find({
      where,
      select: ['id', 'fullName', 'phone', 'companyId', 'currentLocation', 'status',
        'isOnline', 'lastSeenAt', 'vehicleNumber', 'lastAccuracy', 'lastSpeed',
        'lastHeading', 'batteryLevel', 'photoUrl'],
    });
  }

  // ── ALL DRIVERS WITH STATUS ──
  async getDriversWithStatus(companyId?: string) {
    const where: any = { role: UserRole.DRIVER };
    if (companyId) where.companyId = companyId;

    const drivers = await this.userRepo.find({
      where,
      select: ['id', 'fullName', 'phone', 'companyId', 'currentLocation', 'status',
        'isOnline', 'lastSeenAt', 'vehicleNumber', 'lastAccuracy', 'batteryLevel'],
    });

    const now = Date.now();
    return drivers.map(d => {
      let liveStatus = 'OFFLINE';
      if (d.isOnline) {
        const lastSeen = d.lastSeenAt ? new Date(d.lastSeenAt).getTime() : 0;
        if (now - lastSeen > 180000) liveStatus = 'NO_SIGNAL'; // 3 daqiqa
        else liveStatus = 'ONLINE';
      }
      return { ...d, liveStatus };
    });
  }

  // ── LOCATION HISTORY ──
  async getLocationHistory(driverId: string, from: string, to: string) {
    return this.locationRepo.find({
      where: {
        userId: driverId,
        createdAt: MoreThan(new Date(from)),
      },
      order: { createdAt: 'ASC' },
      take: 5000,
    });
  }

  // ── WORK SESSIONS ──
  async getWorkSessions(driverId: string, from?: string, to?: string) {
    const query = this.sessionRepo.createQueryBuilder('s')
      .where('s.driver_id = :driverId', { driverId })
      .orderBy('s.started_at', 'DESC')
      .take(100);
    if (from) query.andWhere('s.started_at >= :from', { from });
    if (to) query.andWhere('s.started_at <= :to', { to });
    return query.getMany();
  }

  async getTodaySession(driverId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.sessionRepo.findOne({
      where: { driverId, startedAt: MoreThan(today) },
      order: { startedAt: 'DESC' },
    });
  }

  // ── STATUS SUMMARY ──
  async getStatusSummary(companyId?: string) {
    const where: any = { role: UserRole.DRIVER };
    if (companyId) where.companyId = companyId;
    const drivers = await this.userRepo.find({ where, select: ['id', 'isOnline', 'lastSeenAt', 'status'] });

    const now = Date.now();
    let online = 0, offline = 0, noSignal = 0, busy = 0;
    drivers.forEach(d => {
      if (!d.isOnline) { offline++; return; }
      const last = d.lastSeenAt ? new Date(d.lastSeenAt).getTime() : 0;
      if (now - last > 180000) noSignal++;
      else if (d.status === 'ACTIVE') online++;
      else busy++;
    });
    return { total: drivers.length, online, offline, noSignal, busy };
  }

  // ── ADDRESS ──
  async saveAddress(data: Partial<CustomerAddress>) {
    const addr = this.addressRepo.create(data);
    return this.addressRepo.save(addr);
  }

  async confirmAddress(orderId: string, userId: string) {
    const addr = await this.addressRepo.findOne({ where: { orderId } });
    if (!addr) throw new NotFoundException('Manzil topilmadi');
    addr.confirmedByOperator = true;
    addr.confirmedBy = userId;
    addr.confirmedAt = new Date();
    return this.addressRepo.save(addr);
  }

  async getAddress(orderId: string) {
    return this.addressRepo.findOne({ where: { orderId }, relations: ['confirmedByUser'] });
  }

  // ── HELPERS ──
  private extractLat(loc: any): number | null {
    if (typeof loc === 'string') {
      const m = loc.match(/\(([-\d.]+),([-\d.]+)\)/);
      return m ? parseFloat(m[2]) : null;
    }
    return null;
  }

  private extractLng(loc: any): number | null {
    if (typeof loc === 'string') {
      const m = loc.match(/\(([-\d.]+),([-\d.]+)\)/);
      return m ? parseFloat(m[1]) : null;
    }
    return null;
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
}
