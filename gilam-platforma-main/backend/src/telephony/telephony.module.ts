import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelephonyService } from './telephony.service';
import { TelephonyController } from './telephony.controller';
import { Company } from '../companies/entities/company.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Company]), AuthModule],
  controllers: [TelephonyController],
  providers: [TelephonyService],
  exports: [TelephonyService],
})
export class TelephonyModule {}
