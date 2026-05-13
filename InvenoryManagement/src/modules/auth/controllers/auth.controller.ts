import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../../../common/response/api-response';
import {
  registerCompanySchema,
  loginSchema,
  inviteUserSchema,
  acceptInviteSchema,
  refreshSchema,
  userIdParamSchema,
  updateUserPermissionsSchema,
} from '../dtos/auth.schema';
import { AuthModuleDependencies } from '../auth.module';

export class AuthController {
  private readonly authService: AuthService;

  constructor(dependencies: AuthModuleDependencies) {
    this.authService = new AuthService(dependencies.db, dependencies.unitOfWork, dependencies.activityService);
  }

  registerCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = registerCompanySchema.parse(req).body;
      const result = await this.authService.registerCompany(
        validatedData.companyName,
        validatedData.adminEmail,
        validatedData.password
      );
      res.status(201).json(ApiResponse.success(result, 'Company registered successfully.'));
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = loginSchema.parse(req).body;
      const result = await this.authService.login(validatedData.email, validatedData.password);
      res.status(200).json(ApiResponse.success(result, 'Login successful.'));
    } catch (error) {
      next(error);
    }
  };

  inviteUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = inviteUserSchema.parse(req).body;
      // Context originates from authMiddleware -> tenantMiddleware
      const tenantId = req.user!.tenantId;

      const result = await this.authService.inviteUsers(
        tenantId,
        validatedData.emails,
        validatedData.role
      );

      res.status(200).json(ApiResponse.success(result, 'Invitations sent successfully.'));
    } catch (error) {
      next(error);
    }
  };

  acceptInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = acceptInviteSchema.parse(req).body;
      const result = await this.authService.acceptInvite(validatedData.token, validatedData.password);
      res.status(200).json(ApiResponse.success(result, 'Invitation accepted.'));
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = refreshSchema.parse(req).body;
      const result = await this.authService.refreshTokens(validatedData.refreshToken);
      res.status(200).json(ApiResponse.success(result, 'Tokens refreshed successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.listUsers(req.user!.tenantId);
      res.status(200).json(ApiResponse.success(result, 'Users fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getUserPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = userIdParamSchema.parse(req);
      const result = await this.authService.getUserPermissions(req.user!.tenantId, validated.params.userId);
      res.status(200).json(ApiResponse.success(result, 'User permissions fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  updateUserPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateUserPermissionsSchema.parse(req);
      const result = await this.authService.updateUserPermissions(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.userId,
        validated.body.permissions,
      );
      res.status(200).json(ApiResponse.success(result, 'User permissions updated successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
