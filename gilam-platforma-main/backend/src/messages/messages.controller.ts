import { Controller, Get, Post, Body, Param, UseGuards, Request, Req } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from '../notifications/notifications.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ChatGateway } from './messages.gateway';

// Dublikat xabar oldini olish uchun kesh (3 soniya ichida bir xil xabarni bloklaydi)
const recentMessages = new Map<string, number>();
setInterval(() => {
  const now = Date.now();
  for (const [key, time] of recentMessages) {
    if (now - time > 5000) recentMessages.delete(key);
  }
}, 10000);

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly notificationsService: NotificationsService,
    private readonly chatGateway: ChatGateway,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Get('conversations')
  async getConversations(@Request() req) {
    const userId = req.user.id;
    return await this.messagesService.getConversations(userId);
  }

  @Get('history/:otherUserId')
  async getHistory(@Request() req, @Param('otherUserId') otherUserId: string) {
    const userId = req.user.id;
    return await this.messagesService.findAllByConversation(userId, otherUserId);
  }

  @Get('support-contact')
  async getSupportContact(@Req() req: any) {
    return await this.messagesService.getSupportContact(req.user?.companyId);
  }

  // Flutter ilovasi shu endpoint orqali xabar yuboradi (REST fallback)
  @Post()
  async createMessage(@Request() req, @Body() body: any) {
    const senderId = req.user.id;
    const { recipientId, text, companyId } = body;

    // Dublikat tekshirish — 3 soniya ichida bir xil xabar kelsa bloklash
    const dedupeKey = `${senderId}:${recipientId}:${text}`;
    const lastSent = recentMessages.get(dedupeKey);
    if (lastSent && Date.now() - lastSent < 3000) {
      console.log(`[HTTP] ⚠️ Dublikat xabar bloklandi: "${text?.substring(0, 30)}"`);
      return { duplicate: true };
    }
    recentMessages.set(dedupeKey, Date.now());

    // 1. DB ga saqlash
    const message = await this.messagesService.create({
      senderId,
      recipientId,
      text,
      companyId,
    });

    // 2. Sender ma'lumotlarini boyitish (UI uchun)
    const senderUser = await this.userRepo.findOne({ where: { id: senderId } });
    const msg = message as any;
    const enriched = {
      id: msg.id,
      text: msg.text,
      senderId: msg.senderId,
      recipientId: msg.recipientId,
      companyId: msg.companyId,
      isRead: msg.isRead,
      createdAt: msg.createdAt,
      senderName: senderUser?.fullName,
      senderRole: senderUser?.role,
      sender: {
        id: senderUser?.id,
        fullName: senderUser?.fullName,
        role: senderUser?.role,
        phone: senderUser?.phone,
      },
    };

    // 3. Recipient ga Socket.IO orqali REAL-TIME xabar
    try {
      this.chatGateway.server.to(`user-${recipientId}`).emit('newMessage', enriched);
      console.log(`[HTTP→Socket] newMessage → user-${recipientId}`);
    } catch (e) {
      console.warn('[HTTP→Socket] Emit failed:', e);
    }

    // 4. Push notification
    try {
      const recipient = await this.userRepo.findOne({ where: { id: recipientId } });
      if (recipient?.expoPushToken) {
        const senderName = senderUser?.fullName || 'Xabar';
        let pushBody = text || '';
        if (text?.startsWith('[IMAGE]:')) pushBody = '📷 Rasm yubordi';
        else if (text?.startsWith('[LOCATION]:')) pushBody = '📍 Lokatsiya yubordi';
        else if (pushBody.length > 80) pushBody = pushBody.substring(0, 80) + '…';

        await this.notificationsService.sendPushNotification(
          recipient.expoPushToken,
          `💬 ${senderName}`,
          pushBody,
          { type: 'chat', senderId, companyId, channelId: 'gilam_chat' },
        );
      }
    } catch (_) {}

    return enriched;
  }
}
