import { Request, Response, NextFunction } from 'express';
import { AppError } from '../exceptions/app-error';

/**
 * Ensures that the authenticated user actually has a tenantId.
 * This is crucial for isolating DB queries downstream.
 * Requires authMiddleware to run first.
 */
export const tenantMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized: Context not found', 401));
  }

  if (!req.user.tenantId) {
    return next(new AppError('Forbidden: No tenant context associated', 403));
  }

  // Tenant is valid, continue
  next();
};
