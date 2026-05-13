import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from './app-error';
import { ApiResponse } from '../response/api-response';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(ApiResponse.error(err.message));
    return;
  }

  // Handle generic validation errors (like from Zod)
  if (err instanceof ZodError) {
    res.status(400).json(
      ApiResponse.error(
        'Validation Error',
        err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }))
      )
    );
    return;
  }

  // Fallback for unhandled/programming errors
  console.error('Unhandled Exception:', err);
  if ((err as any).sql) {
    console.error('Failed SQL:', (err as any).sql);
    console.error('SQL Params:', (err as any).params);
  }
  res.status(500).json(ApiResponse.error('Internal Server Error'));
};
