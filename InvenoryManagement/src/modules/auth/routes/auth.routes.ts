import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../../../common/middlewares/auth.middleware';
import { tenantMiddleware } from '../../../common/middlewares/tenant.middleware';
import { requirePermission, requireRole } from '../../../common/middlewares/rbac.middleware';
import { AuthModuleDependencies } from '../auth.module';

export const createAuthRouter = (dependencies: AuthModuleDependencies) => {
  const authRouter = Router();
  const authController = new AuthController(dependencies);

  // Public routes (No authentication required)
  authRouter.post('/register-company', authController.registerCompany);
  authRouter.post('/login', authController.login);
  authRouter.post('/refresh', authController.refresh);
  authRouter.post('/accept-invite', authController.acceptInvite);

  // Protected routes (Tenant context and specific roles required)
  authRouter.post(
    '/invite',
    authMiddleware,
    tenantMiddleware,
    requireRole(['SUPER_ADMIN']),
    requirePermission(dependencies.db, 'USERS', 'CREATE'),
    authController.inviteUsers,
  );

  authRouter.get(
    '/users',
    authMiddleware,
    tenantMiddleware,
    requireRole(['SUPER_ADMIN']),
    requirePermission(dependencies.db, 'USERS', 'READ'),
    authController.listUsers,
  );

  authRouter.get(
    '/users/:userId/permissions',
    authMiddleware,
    tenantMiddleware,
    requireRole(['SUPER_ADMIN']),
    requirePermission(dependencies.db, 'USERS', 'READ'),
    authController.getUserPermissions,
  );

  authRouter.put(
    '/users/:userId/permissions',
    authMiddleware,
    tenantMiddleware,
    requireRole(['SUPER_ADMIN']),
    requirePermission(dependencies.db, 'USERS', 'UPDATE'),
    authController.updateUserPermissions,
  );

  return authRouter;
};
