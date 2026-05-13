import { Router } from 'express';
import { authMiddleware } from '../../../common/middlewares/auth.middleware';
import { requirePermission } from '../../../common/middlewares/rbac.middleware';
import { tenantMiddleware } from '../../../common/middlewares/tenant.middleware';
import { ProcurementModuleDependencies } from '../procurement.module';
import { ProcurementController } from '../controllers/procurement.controller';

export const createProcurementRouter = (dependencies: ProcurementModuleDependencies) => {
  const router = Router();
  const controller = new ProcurementController(dependencies);

  router.use(authMiddleware, tenantMiddleware);

  router.post('/requisitions', requirePermission(dependencies.db, 'PURCHASES', 'CREATE'), controller.createRequisition);
  router.get('/requisitions', requirePermission(dependencies.db, 'PURCHASES', 'READ'), controller.listRequisitions);
  router.get('/requisitions/:requisitionId', requirePermission(dependencies.db, 'PURCHASES', 'READ'), controller.getRequisitionById);
  router.post('/requisitions/:requisitionId/submit', requirePermission(dependencies.db, 'PURCHASES', 'UPDATE'), controller.submitRequisition);
  router.post('/requisitions/:requisitionId/approve', requirePermission(dependencies.db, 'PURCHASES', 'UPDATE'), controller.approveRequisition);
  router.post('/requisitions/:requisitionId/reject', requirePermission(dependencies.db, 'PURCHASES', 'UPDATE'), controller.rejectRequisition);

  return router;
};
