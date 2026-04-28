import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { ChatGateway } from './messages.gateway';
import { Message } from './entities/message.entity';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User]),
    AuthModule,
    NotificationsModule,
  ],
  providers: [MessagesService, ChatGateway],
  controllers: [MessagesController],
  exports: [MessagesService],
})
export class MessagesModule {}
