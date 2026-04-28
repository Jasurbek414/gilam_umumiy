import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CompaniesModule } from './companies/companies.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { ServicesModule } from './services/services.module';
import { OrdersModule } from './orders/orders.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TelephonyModule } from './telephony/telephony.module';
import { MessagesModule } from './messages/messages.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { GatewayModule } from './gateway/gateway.module';
import { CallsModule } from './calls/calls.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ExpensesModule } from './expenses/expenses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    ScheduleModule.forRoot(),
    CompaniesModule,
    UsersModule,
    AuthModule,
    CustomersModule,
    ServicesModule,
    OrdersModule,
    NotificationsModule,
    TelephonyModule,
    MessagesModule,
    CampaignsModule,
    CallsModule,
    GatewayModule,
    ExpensesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
