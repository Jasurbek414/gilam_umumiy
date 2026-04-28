import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/calls',
  path: '/api/socket.io',
})
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CallsGateway.name);

  // operatorId → socket.id xaritasi
  private operatorSockets: Map<string, string> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Socket uzilganda operatorni ro'yxatdan o'chirish
    for (const [opId, socketId] of this.operatorSockets.entries()) {
      if (socketId === client.id) {
        this.operatorSockets.delete(opId);
        this.logger.log(`Operator ${opId} disconnected`);
        break;
      }
    }
  }

  @SubscribeMessage('operator:join')
  handleOperatorJoin(
    @MessageBody() data: { operatorId: string; companyId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.operatorSockets.set(data.operatorId, client.id);
    // Company room ga qo'shish (company level events uchun)
    client.join(`company:${data.companyId}`);
    // Operator o'z room'iga ham qo'shiladi
    client.join(`operator:${data.operatorId}`);
    // Barcha operatorlar uchun global room
    client.join('all:operators');
    this.logger.log(`Operator ${data.operatorId} joined`);
    return { status: 'ok' };
  }

  @SubscribeMessage('operator:leave')
  handleOperatorLeave(
    @MessageBody() data: { operatorId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.operatorSockets.delete(data.operatorId);
    client.leave(`operator:${data.operatorId}`);
    return { status: 'ok' };
  }

  // Yangi kiruvchi qo'ng'iroqni operatorga yuborish
  notifyIncomingCall(operatorId: string, callData: any) {
    this.server.to(`operator:${operatorId}`).emit('call:incoming', callData);
  }

  // Barcha company operatorlariga qo'ng'iroq xabari yuborish
  notifyCompanyCall(companyId: string, callData: any) {
    this.server.to(`company:${companyId}`).emit('call:incoming', callData);
  }

  // Qo'ng'iroq holati o'zgarishini yuborish
  notifyCallUpdate(companyId: string, callData: any) {
    this.server.to(`company:${companyId}`).emit('call:updated', callData);
    this.server.to('all:operators').emit('call:updated', callData);
  }

  // Boshqa operator qo'ng'iroqni oldi — qolganlarning modali yopilishi kerak
  notifyCallTaken(
    companyId: string,
    data: { callId: string; operatorId: string; takenAt: Date },
  ) {
    this.server.to(`company:${companyId}`).emit('call:taken', data);
    this.server.to('all:operators').emit('call:taken', data);
  }

  // Operator online/offline holati
  notifyOperatorStatus(companyId: string, operatorId: string, status: string) {
    this.server.to(`company:${companyId}`).emit('operator:status', { operatorId, status });
    this.server.to('all:operators').emit('operator:status', { operatorId, status });
  }

  // Barcha operatorlarga qo'ng'iroq xabari yuborish (global)
  notifyAllOperators(data: any) {
    this.server.to('all:operators').emit('call:incoming', data);
  }

  isOperatorOnline(operatorId: string): boolean {
    return this.operatorSockets.has(operatorId);
  }
}
