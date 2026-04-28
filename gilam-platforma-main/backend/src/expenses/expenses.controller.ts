import { Controller, Get, Post, Patch, Body, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { Expense } from './entities/expense.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(@Body() data: Partial<Expense>) {
    return this.expensesService.create(data);
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
  remove(@Param('id') id: string) {
    return this.expensesService.remove(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Partial<Expense>) {
    return this.expensesService.update(id, data);
  }
}
