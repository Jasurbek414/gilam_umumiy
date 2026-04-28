import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../companies/entities/company.entity';

@Injectable()
export class TelephonyService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  async getSipConfig(companyId: string) {
    if (!companyId) return {};
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) return {};
    return company.sipCredentials || {};
  }

  async updateSipConfig(companyId: string, credentials: any) {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Company not found');
    company.sipCredentials = credentials;
    await this.companyRepository.save(company);
    return company.sipCredentials;
  }
}
