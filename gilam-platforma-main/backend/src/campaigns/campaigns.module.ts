import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from './entities/campaign.entity';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, User]), AuthModule],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
