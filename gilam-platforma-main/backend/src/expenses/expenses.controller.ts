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
    return this.expensesService.create(data, user?.id);
  }

  @Get('company/:companyId')
  findAll(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.expensesService.findAllByCompany(companyId, startDate, endDate);
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
