import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { Request } from 'express';
import { User } from '../users/entities/user.entity';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token topilmadi');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'super-secret-key-1234',
      });
    } catch (e) {
      throw new UnauthorizedException('Token yaroqsiz yoki muddati tugagan');
    }

    // Bazadan haqiqiy foydalanuvchini yuklaymiz (stale token muammosidan himoya)
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: payload.sub },
      relations: ['company'],
    });

    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi (Token eskirgan)');
    }
    request['user'] = user;
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
