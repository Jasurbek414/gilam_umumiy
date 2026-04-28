import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async create(createMessageDto: any) {
    const message = this.messageRepository.create(createMessageDto);
    return await this.messageRepository.save(message);
  }

  async findAllByConversation(userId1: string, userId2: string) {
    // Barcha operator/admin xodimlar bilan suhbatni birlashtirish
    // Muhim: camelCase alias ishlatiladi — frontend senderId, createdAt kutadi
    return await this.messageRepository.query(
      `SELECT 
         m.id,
         m.text,
         m.sender_id        AS "senderId",
         m.recipient_id     AS "recipientId",
         m.company_id       AS "companyId",
         m.is_read          AS "isRead",
         m.created_at       AS "createdAt",
         s.full_name        AS "senderName",
         s.role             AS "senderRole",
         json_build_object(
           'id',       s.id,
           'fullName', s.full_name,
           'role',     s.role,
           'phone',    s.phone
         )                  AS sender
       FROM messages m
       LEFT JOIN users s ON s.id = m.sender_id
       LEFT JOIN users r ON r.id = m.recipient_id
       WHERE 
         (m.sender_id = $1 OR m.recipient_id = $1)
         AND (
           m.sender_id = $2 OR m.recipient_id = $2
           OR (s.role  IN ('OPERATOR','COMPANY_ADMIN','SUPER_ADMIN') AND m.recipient_id = $1)
           OR (r.role  IN ('OPERATOR','COMPANY_ADMIN','SUPER_ADMIN') AND m.sender_id   = $1)
         )
       ORDER BY m.created_at ASC`,
      [userId1, userId2]
    );
  }

  async getConversations(userId: string) {
    // Basic logic to get unique speakers for a user
    const sent = await this.messageRepository.find({
      where: { senderId: userId },
      relations: ['recipient'],
    });
    const received = await this.messageRepository.find({
      where: { recipientId: userId },
      relations: ['sender'],
    });

    const others = new Set();
    const results: any[] = [];

    [...sent.map((m) => m.recipient), ...received.map((m) => m.sender)].forEach(
      (user) => {
        if (
          user &&
          (user as any).id !== userId &&
          !others.has((user as any).id)
        ) {
          others.add((user as any).id);
          results.push(user);
        }
      },
    );

    return results;
  }

  async getSupportContact(companyId?: string) {
    if (companyId) {
      // OPERATOR avval, keyin COMPANY_ADMIN
      const support = await this.messageRepository.manager.query(
        `SELECT id, full_name as "fullName", role, phone FROM "users" 
         WHERE company_id = $1 AND (role = 'OPERATOR' OR role = 'COMPANY_ADMIN') 
         ORDER BY CASE role WHEN 'OPERATOR' THEN 1 WHEN 'COMPANY_ADMIN' THEN 2 ELSE 3 END
         LIMIT 1`,
        [companyId]
      );
      if (support && support.length > 0) return support[0];
    }
    
    // Fallback: super admin
    const fallback = await this.messageRepository.manager.query(
      `SELECT id, full_name as "fullName", role, phone FROM "users" WHERE role = 'SUPER_ADMIN' LIMIT 1`
    );
    return fallback && fallback.length > 0 ? fallback[0] : null;
  }
}
