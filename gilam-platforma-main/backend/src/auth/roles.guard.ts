import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true; // If no roles are defined, anyone can access
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) return false;

    // Super Admin can access everything
    if (user.role === UserRole.SUPER_ADMIN) return true;

    return requiredRoles.includes(user.role);
  }
}
