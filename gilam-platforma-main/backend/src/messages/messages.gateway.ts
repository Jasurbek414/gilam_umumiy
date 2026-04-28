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
import { MessagesService } from './messages.service';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from '../notifications/notifications.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'chat',
  path: '/socket.io',
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['polling', 'websocket'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(
    private readonly messagesService: MessagesService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.query.token as string;
      if (!token) {
        socket.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      this.connectedUsers.set(userId, socket.id);
      socket.join(`user-${userId}`);

      console.log(`User connected to chat: ${userId}`);
    } catch (e) {
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: Socket) {
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === socket.id) {
        this.connectedUsers.delete(userId);
        console.log(`User disconnected from chat: ${userId}`);
        break;
      }
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: { recipientId: string; text: string; companyId: string },
  ) {
    const senderSocketId = socket.id;
    let senderId: string | null = null;

    for (const [uId, sId] of this.connectedUsers.entries()) {
      if (sId === senderSocketId) {
        senderId = uId;
        break;
      }
    }

    if (!senderId) return;

    try {
      // Save to DB — canonical source of truth
      const message = await this.messagesService.create({
        text: data.text,
        senderId,
        recipientId: data.recipientId,
        companyId: data.companyId,
      });

      // Sender ma'lumotini olib qo'shamiz (UI uchun)
      const senderUser = await this.userRepository.findOne({ where: { id: senderId } });
      const enriched = { ...message, sender: senderUser };

      // 1. Deliver to recipient's room
      this.server.to(`user-${data.recipientId}`).emit('newMessage', enriched);

      // NOTE: senderga qaytarmaymiz — emit callback (return message) orqali qaytadi
      // Aks holda Electron ilovada xabar 2 tadan ko'rinadi

      // 3. Always send push notification (mobile app will handle foreground suppression)
      try {
        const recipient = await this.userRepository.findOne({
          where: { id: data.recipientId },
        });
        if (recipient?.expoPushToken) {
          const senderUser = await this.userRepository.findOne({
            where: { id: senderId },
          });
          const senderName = senderUser?.fullName || 'Xabar';

          // Push notification matni: rasm/lokatsiya uchun maxsus
          let pushBody = data.text;
          if (data.text?.startsWith('[IMAGE]:')) {
            pushBody = '📷 Rasm yubordi';
          } else if (data.text?.startsWith('[LOCATION]:')) {
            pushBody = '📍 Lokatsiya yubordi';
          } else if (pushBody && pushBody.length > 80) {
            pushBody = pushBody.substring(0, 80) + '…';
          }

          await this.notificationsService.sendPushNotification(
            recipient.expoPushToken,
            `💬 ${senderName}`,
            pushBody,
            {
              type: 'chat',
              senderId,
              companyId: data.companyId,
              channelId: 'chat_messages',
            },
          );
        }
      } catch (pushErr) {
        // Push failure must not break message delivery
        console.warn('[Chat] Push notification error:', pushErr);
      }

      return message;
    } catch (e) {
      console.error('SendMessage DB Error:', e);
      return { error: 'Failed to save message' };
    }
  }
}
