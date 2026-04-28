import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private dataSource: DataSource
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('public/companies')
  async getPublicCompanies() {
    return this.dataSource.query('SELECT id, name FROM companies ORDER BY name ASC');
  }
}
