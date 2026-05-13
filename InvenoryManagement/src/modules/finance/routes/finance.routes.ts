import { Router } from 'express';
import { authMiddleware } from '../../../common/middlewares/auth.middleware';
import { requirePermission } from '../../../common/middlewares/rbac.middleware';
import { tenantMiddleware } from '../../../common/middlewares/tenant.middleware';
import { Queryable } from '../../../database/database.types';
import { UnitOfWork } from '../../../database/unit-of-work';
import { ActivityService } from '../../activity/services/activity.service';
import { FinanceController } from '../controllers/finance.controller';
import { FinanceService } from '../services/finance.service';

export const setupFinanceRoutes = (dependencies: { db: Queryable; unitOfWork: UnitOfWork }) => {
  const router = Router();
  const activityService = new ActivityService(dependencies.db);
  const service = new FinanceService(dependencies.db, dependencies.unitOfWork, activityService);
  const controller = new FinanceController(service);

  router.use(authMiddleware);
  router.use(tenantMiddleware);

  router.post('/ap-invoices', requirePermission(dependencies.db, 'FINANCE', 'CREATE'), controller.createAPInvoice);
  router.post('/three-way-match', requirePermission(dependencies.db, 'FINANCE', 'UPDATE'), controller.performMatch);

  return router;
};
