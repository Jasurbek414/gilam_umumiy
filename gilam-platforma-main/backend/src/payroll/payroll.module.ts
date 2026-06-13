import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollPeriod } from './entities/payroll-period.entity';
import { PayrollItem } from './entities/payroll-item.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { User } from '../users/entities/user.entity';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { AdvancesModule } from '../advances/advances.module';
import { BonusesModule } from '../bonuses/bonuses.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayrollPeriod, PayrollItem, Attendance, User]),
    AdvancesModule,
    BonusesModule,
    AuditModule,
    AuthModule,
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
