import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { UserRole, UserStatus } from '../entities/user.entity';

export class CreateUserDto {
  @IsOptional()
  @IsUUID()
  companyId?: string | null;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsUUID()
  companyId?: string | null;

  @IsOptional()
  currentLocation?: any;
}
