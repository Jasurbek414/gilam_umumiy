import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { LocationHistory } from './entities/location-history.entity';
import { LocationCleanupService } from './location-cleanup.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, LocationHistory]), forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [UsersService, LocationCleanupService],
  exports: [UsersService],
})
export class UsersModule {}
