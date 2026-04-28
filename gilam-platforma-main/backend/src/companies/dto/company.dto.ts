import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CompanyStatus } from '../entities/company.entity';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  sipCredentials?: any;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;
}

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  sipCredentials?: any;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @IsOptional()
  @IsString()
  subscriptionEndDate?: string;
}
