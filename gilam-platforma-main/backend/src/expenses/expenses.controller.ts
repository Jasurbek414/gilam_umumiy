import { Controller, Get, Post, Patch, Body, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { Expense } from './entities/expense.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(@Body() data: Partial<Expense>, @CurrentUser() user: User) {
    if (user.role !== 'SUPER_ADMIN') {
      data.companyId = user.companyId;
    }
    return this.expensesService.create(data, user?.id);
  }

  @Get('company/:companyId')
  findAll(
    @Param('companyId') companyId: string,
    @CurrentUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const targetId = user.role === 'SUPER_ADMIN' ? companyId : user.companyId;
    return this.expensesService.findAllByCompany(targetId, startDate, endDate);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.expensesService.findAllByUser(userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.expensesService.remove(id, user?.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Partial<Expense>, @CurrentUser() user: User) {
    return this.expensesService.update(id, data, user?.id);
  }
}
