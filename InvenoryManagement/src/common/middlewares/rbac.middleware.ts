import { Request, Response, NextFunction } from 'express';
import { AppError } from '../exceptions/app-error';
import { JwtPayload } from '../utils/jwt.util';
import { Queryable } from '../../database/database.types';
import {
  DEFAULT_ROLE_PERMISSIONS,
  UserPermissionActionValue,
  UserPermissionResourceValue,
  expandPermissionActions,
} from '../constants/permissions';
import { UserRepository } from '../../modules/auth/repositories/user.repository';

export const requireRole = (allowedRoles: Array<JwtPayload['role']>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    if (req.user.role !== 'SUPER_ADMIN' && !allowedRoles.includes(req.user.role)) {
      return next(new AppError('Forbidden: Insufficient permissions', 403));
    }

    next();
  };
};

function hasDefaultAccess(
  role: JwtPayload['role'],
  resource: UserPermissionResourceValue,
  action: UserPermissionActionValue,
): boolean {
  if (role === 'SUPER_ADMIN') {
    return true;
  }

  const defaults = DEFAULT_ROLE_PERMISSIONS[role]?.[resource] ?? [];
  return expandPermissionActions(defaults).includes(action);
}

export const requirePermission = (
  db: Queryable,
  resource: UserPermissionResourceValue,
  action: UserPermissionActionValue,
) => {
  const userRepository = new UserRepository(db);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError('Unauthorized', 401));
      }

      if (req.user.role === 'SUPER_ADMIN') {
        return next();
      }

      const assignedPermissions = await userRepository.listPermissionsByUserId(
        req.user.tenantId,
        req.user.userId,
      );
      const resourcePermissions = assignedPermissions.filter((permission) => permission.resource === resource);

      if (resourcePermissions.length > 0) {
        const explicitActions = expandPermissionActions(resourcePermissions.map((permission) => permission.action));
        if (!explicitActions.includes(action)) {
          return next(new AppError('Forbidden: Insufficient permissions', 403));
        }

        return next();
      }

      if (!hasDefaultAccess(req.user.role, resource, action)) {
        return next(new AppError('Forbidden: Insufficient permissions', 403));
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
