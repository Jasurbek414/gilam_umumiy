import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateCompanyDto): Promise<Company> {
    const company = this.companyRepository.create(dto);
    const saved = await this.companyRepository.save(company);

    // Notify Super Admin
    await this.notificationsService.create({
      title: "Yangi korxona qo'shildi!",
      text: `Tizimda yangi korxona ("${saved.name}") ro'yxatdan o'tdi.`,
      type: 'system',
    });

    return saved;
  }

  async findAll(): Promise<Company[]> {
    return this.companyRepository.find({
      relations: ['users'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: ['users'],
    });
    if (!company) {
      throw new NotFoundException(`Kompaniya #${id} topilmadi`);
    }
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);
    Object.assign(company, dto);
    return this.companyRepository.save(company);
  }

  async remove(id: string): Promise<void> {
    const company = await this.findOne(id);
    await this.companyRepository.remove(company);
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const [companies, total] = await this.companyRepository.findAndCount();
    const active = companies.filter((c) => c.status === 'ACTIVE').length;
    return { total, active, inactive: total - active };
  }
}
