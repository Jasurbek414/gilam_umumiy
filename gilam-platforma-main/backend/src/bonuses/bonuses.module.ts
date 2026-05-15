import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bonus } from './entities/bonus.entity';
import { Penalty } from './entities/penalty.entity';
import { BonusesService } from './bonuses.service';
import { BonusesController } from './bonuses.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bonus, Penalty]),
    AuditModule,
  ],
  controllers: [BonusesController],
  providers: [BonusesService],
  exports: [BonusesService],
})
export class BonusesModule {}
