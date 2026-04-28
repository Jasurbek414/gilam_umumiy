import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { StagesController } from './stages.controller';
import { OrdersService } from './orders.service';
import { DeadlineCronService } from './deadline-cron.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { FacilityStage } from './entities/facility-stage.entity';
import { OrderAction } from './entities/order-action.entity';
import { Service } from '../services/entities/service.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Service, FacilityStage, OrderAction]),
    NotificationsModule,
    AuthModule,
    forwardRef(() => GatewayModule),
  ],
  controllers: [OrdersController, StagesController],
  providers: [OrdersService, DeadlineCronService],
  exports: [OrdersService],
})
export class OrdersModule {}
