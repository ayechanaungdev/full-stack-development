import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Read the roles metadata from the endpoint class or method
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. If no roles are required on this endpoint, let anyone in!
    if (!requiredRoles) {
      return true;
    }

    // 3. Extract the request object
    const { user } = context
      .switchToHttp()
      .getRequest<{ user: { role: string } }>();

    // 4. If there is no user attached to the request, block it
    if (!user) {
      return false;
    }

    // 5. Check if the user's role matches one of the required roles
    return requiredRoles.some((role) => user.role === role);
  }
}
