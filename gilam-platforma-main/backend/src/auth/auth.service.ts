import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(phone: string, pass: string): Promise<any> {
    const user = await this.usersService.findByPhone(phone);
    if (!user) return null;
    const ok = await bcrypt.compare(pass, user.passwordHash);
    if (user && ok) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      phone: user.phone,
      sub: user.id,
      role: user.role,
      companyId: user.companyId,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(registerDto: any) {
    const existing = await this.usersService.findByPhone(registerDto.phone);
    if (existing) {
      throw new UnauthorizedException('User with this phone already exists');
    }

    const user = await this.usersService.create({
      phone: registerDto.phone,
      password: registerDto.password,
      fullName: registerDto.fullName,
      role: registerDto.role,
      companyId: registerDto.companyId,
    });

    return this.login(user);
  }
}
