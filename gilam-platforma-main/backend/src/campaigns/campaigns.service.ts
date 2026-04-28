import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Campaign } from './entities/campaign.entity';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignsRepo: Repository<Campaign>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  async findAll(companyId: string): Promise<Campaign[]> {
    return this.campaignsRepo.find({
      where: { companyId },
      relations: ['operators', 'driver'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, companyId: string): Promise<Campaign> {
    const campaign = await this.campaignsRepo.findOne({
      where: { id, companyId },
      relations: ['operators', 'driver'],
    });
    if (!campaign) throw new NotFoundException('Kampaniya topilmadi');
    return campaign;
  }

  // Qaysi raqamga qo'ng'iroq kelganini topish (asosiy + qo'shimcha raqamlar)
  async findByPhoneNumber(phoneNumber: string): Promise<Campaign | null> {
    // Avval asosiy raqamdan qidirish
    const byMain = await this.campaignsRepo.findOne({
      where: { phoneNumber, status: 'ACTIVE' as any },
      relations: ['operators', 'driver'],
    });
    if (byMain) return byMain;

    // Keyin qo'shimcha raqamlardan qidirish (JSON contains)
    const byExtra = await this.campaignsRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.operators', 'operators')
      .leftJoinAndSelect('c.driver', 'driver')
      .where('c.status = :status', { status: 'ACTIVE' })
      .andWhere(
        ':phone = ANY(ARRAY(SELECT jsonb_array_elements_text(c.extra_numbers)))',
        {
          phone: phoneNumber,
        },
      )
      .getOne();

    return byExtra;
  }

  async findOperatorCampaigns(operatorId: string): Promise<Campaign[]> {
    return this.campaignsRepo
      .createQueryBuilder('c')
      .innerJoin('c.operators', 'op', 'op.id = :operatorId', { operatorId })
      .leftJoinAndSelect('c.operators', 'operators')
      .leftJoinAndSelect('c.driver', 'driver')
      .where('c.status = :status', { status: 'ACTIVE' })
      .getMany();
  }

  async create(companyId: string, dto: CreateCampaignDto): Promise<Campaign> {
    const campaign = this.campaignsRepo.create({
      companyId,
      name: dto.name,
      phoneNumber: dto.phoneNumber,
      extraNumbers: dto.extraNumbers || [],
      description: dto.description,
      status: dto.status,
      driverId: dto.driverId,
    });
    if (dto.operatorIds?.length) {
      campaign.operators = await this.usersRepo.findBy({
        id: In(dto.operatorIds),
      });
    } else {
      campaign.operators = [];
    }
    return this.campaignsRepo.save(campaign);
  }

  async update(
    id: string,
    companyId: string,
    dto: UpdateCampaignDto,
  ): Promise<Campaign> {
    const campaign = await this.findOne(id, companyId);
    if (dto.name !== undefined) campaign.name = dto.name;
    if (dto.phoneNumber !== undefined) campaign.phoneNumber = dto.phoneNumber;
    if (dto.extraNumbers !== undefined)
      campaign.extraNumbers = dto.extraNumbers;
    if (dto.description !== undefined) campaign.description = dto.description;
    if (dto.status !== undefined) campaign.status = dto.status;
    if (dto.driverId !== undefined)
      campaign.driverId = dto.driverId || undefined;
    if (dto.operatorIds !== undefined) {
      campaign.operators = dto.operatorIds.length
        ? await this.usersRepo.findBy({ id: In(dto.operatorIds) })
        : [];
    }
    return this.campaignsRepo.save(campaign);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const campaign = await this.findOne(id, companyId);
    await this.campaignsRepo.remove(campaign);
  }
}
