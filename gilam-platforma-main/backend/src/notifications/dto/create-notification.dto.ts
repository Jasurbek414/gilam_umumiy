import { IsString, IsUUID, IsOptional, IsBoolean } from 'class-validator';

export class CreateNotificationDto {
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsUUID() userId?: string;
  @IsString() title: string;
  @IsString() text: string;
  @IsOptional() @IsString() type?: string;
}
