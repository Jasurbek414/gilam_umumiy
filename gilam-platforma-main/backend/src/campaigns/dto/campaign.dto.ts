import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { CampaignStatus } from '../entities/campaign.entity';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  extraNumbers?: string[];

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;

  @IsUUID()
  @IsOptional()
  driverId?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  operatorIds?: string[];
}

export class UpdateCampaignDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  extraNumbers?: string[];

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;

  @IsUUID()
  @IsOptional()
  driverId?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  operatorIds?: string[];
}
