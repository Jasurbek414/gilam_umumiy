import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { Expense } from './entities/expense.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Expense]), AuthModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService]
})
export class ExpensesModule {}
