import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect,
  MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/drivers',
  path: '/api/socket.io',
})
export class DriversGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(DriversGateway.name);

  // driverId → socketId
  private driverSockets: Map<string, string> = new Map();

  constructor(
    private readonly driversService: DriversService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Driver client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    for (const [driverId, socketId] of this.driverSockets.entries()) {
      if (socketId === client.id) {
        this.driverSockets.delete(driverId);
        this.logger.log(`Driver ${driverId} disconnected`);
        // Broadcast offline
        this.server.emit('driver.offline', { driverId });
        break;
      }
    }
  }

  @SubscribeMessage('driver:online')
  async handleDriverOnline(
    @MessageBody() data: { driverId: string; companyId: string; latitude?: number; longitude?: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.driverSockets.set(data.driverId, client.id);
    client.join(`company:${data.companyId}`);
    client.join(`driver:${data.driverId}`);

    await this.driversService.goOnline(data.driverId, data.latitude, data.longitude);

    // Broadcast to web clients watching this company
    this.server.to(`company:${data.companyId}`).emit('driver.online', {
      driverId: data.driverId,
      companyId: data.companyId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Driver ${data.driverId} online`);
    return { status: 'ok' };
  }

  @SubscribeMessage('driver:offline')
  async handleDriverOffline(
    @MessageBody() data: { driverId: string; reason?: string; latitude?: number; longitude?: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.driverSockets.delete(data.driverId);
    await this.driversService.goOffline(data.driverId, data.reason, data.latitude, data.longitude);

    const driver = await this.userRepo.findOne({ where: { id: data.driverId }});
    if (driver?.companyId) {
      this.server.to(`company:${driver.companyId}`).emit('driver.offline', {
        driverId: data.driverId,
        reason: data.reason,
        timestamp: new Date().toISOString(),
      });
    }

    this.logger.log(`Driver ${data.driverId} offline: ${data.reason}`);
    return { status: 'ok' };
  }

  @SubscribeMessage('driver:location')
  async handleLocationUpdate(
    @MessageBody() data: {
      driverId: string; latitude: number; longitude: number;
      accuracy?: number; speed?: number; heading?: number;
      battery?: number; isMock?: boolean;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const result = await this.driversService.updateLocation(data.driverId, data);

    if (result.accepted) {
      // Real-time broadcast to all connected web clients in the company
      const driver = await this.userRepo.findOne({ where: { id: data.driverId }});
      if (driver?.companyId) {
        this.server.to(`company:${driver.companyId}`).emit('driver.location.updated', {
          driverId: data.driverId,
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy,
          speed: data.speed,
          heading: data.heading,
          battery: data.battery,
          timestamp: new Date().toISOString(),
        });

        if (result.isMock) {
          this.server.to(`company:${driver.companyId}`).emit('driver.mock_location', { driverId: data.driverId });
        }
        if (result.lowAccuracy) {
          this.server.to(`company:${driver.companyId}`).emit('driver.low_accuracy', {
            driverId: data.driverId,
            accuracy: data.accuracy,
          });
        }
      }
    }

    return result;
  }

  @SubscribeMessage('web:join')
  handleWebJoin(
    @MessageBody() data: { userId: string; companyId?: string; role: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.companyId) client.join(`company:${data.companyId}`);
    if (data.role === 'SUPER_ADMIN') client.join('all:drivers');
    client.join('web:clients');
    this.logger.log(`Web client joined: ${data.userId} (${data.role})`);
    return { status: 'ok' };
  }

  // Har 30 soniyada aloqa yo'q driverlarni aniqlash
  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkConnectionLost() {
    const threshold = new Date(Date.now() - 180000); // 3 daqiqa
    const lostDrivers = await this.userRepo.find({
      where: {
        role: UserRole.DRIVER,
        isOnline: true,
      },
      select: ['id', 'lastSeenAt', 'companyId'],
    });

    for (const d of lostDrivers) {
      if (d.lastSeenAt && d.lastSeenAt < threshold) {
        this.server.to(`company:${d.companyId}`).emit('driver.connection.lost', {
          driverId: d.id,
          companyId: d.companyId,
          lastSeenAt: d.lastSeenAt,
        });
      }
    }
  }
}
