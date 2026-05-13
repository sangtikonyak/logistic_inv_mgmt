import { Router } from 'express';
import { authMiddleware } from '../../../common/middlewares/auth.middleware';
import { requirePermission } from '../../../common/middlewares/rbac.middleware';
import { tenantMiddleware } from '../../../common/middlewares/tenant.middleware';
import { ReplenishmentModuleDependencies } from '../replenishment.module';
import { DemandSnapshotController } from '../controllers/demand-snapshot.controller';

export const createReplenishmentRouter = (dependencies: ReplenishmentModuleDependencies) => {
  const router = Router();
  const controller = new DemandSnapshotController(dependencies);

  router.use(authMiddleware, tenantMiddleware);

  router.get(
    '/demand-snapshots',
    requirePermission(dependencies.db, 'REPLENISHMENT', 'READ'),
    controller.listSnapshots,
  );
  router.get(
    '/demand-snapshots/:snapshotId',
    requirePermission(dependencies.db, 'REPLENISHMENT', 'READ'),
    controller.getSnapshotById,
  );
  router.post(
    '/demand-snapshots/refresh',
    requirePermission(dependencies.db, 'REPLENISHMENT', 'UPDATE'),
    controller.refreshSnapshots,
  );

  return router;
};
