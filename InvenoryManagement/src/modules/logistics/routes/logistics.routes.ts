import { Router } from 'express';
import { authMiddleware } from '../../../common/middlewares/auth.middleware';
import { requirePermission } from '../../../common/middlewares/rbac.middleware';
import { tenantMiddleware } from '../../../common/middlewares/tenant.middleware';
import { Queryable } from '../../../database/database.types';
import { UnitOfWork } from '../../../database/unit-of-work';
import { ActivityService } from '../../activity/services/activity.service';
import { LogisticsController } from '../controllers/logistics.controller';
import { LogisticsService } from '../services/logistics.service';

export const setupLogisticsRoutes = (dependencies: { db: Queryable; unitOfWork: UnitOfWork }) => {
  const router = Router();
  const activityService = new ActivityService(dependencies.db);
  const service = new LogisticsService(dependencies.db, dependencies.unitOfWork, activityService);
  const controller = new LogisticsController(service);

  router.use(authMiddleware);
  router.use(tenantMiddleware);

  router.post('/shipments', requirePermission(dependencies.db, 'LOGISTICS', 'CREATE'), controller.createShipment);
  router.post('/shipments/:shipmentId/dispatch', requirePermission(dependencies.db, 'LOGISTICS', 'UPDATE'), controller.dispatchShipment);
  router.post('/shipments/:shipmentId/deliver', requirePermission(dependencies.db, 'LOGISTICS', 'UPDATE'), controller.recordDelivery);

  return router;
};
