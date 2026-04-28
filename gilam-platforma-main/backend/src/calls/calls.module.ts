import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Call } from './entities/call.entity';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { Customer } from '../customers/entities/customer.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { GatewayModule } from '../gateway/gateway.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Call, Customer, Order, User]),
    CampaignsModule,
    forwardRef(() => GatewayModule),
    AuthModule,
  ],
  controllers: [CallsController],
  providers: [CallsService],
  exports: [CallsService],
})
export class CallsModule {}
