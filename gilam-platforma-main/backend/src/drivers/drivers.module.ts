import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { LocationHistory } from '../users/entities/location-history.entity';
import { DriverWorkSession } from './entities/driver-work-session.entity';
import { CustomerAddress } from './entities/customer-address.entity';
import { DriversService } from './drivers.service';
import { DriversController, AddressController } from './drivers.controller';
import { DriversGateway } from './drivers.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([User, LocationHistory, DriverWorkSession, CustomerAddress]),
  ],
  controllers: [DriversController, AddressController],
  providers: [DriversService, DriversGateway],
  exports: [DriversService, DriversGateway],
})
export class DriversModule {}
