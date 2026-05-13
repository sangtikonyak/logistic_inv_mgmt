import { Router } from 'express';
import { authMiddleware } from '../../../common/middlewares/auth.middleware';
import { requirePermission } from '../../../common/middlewares/rbac.middleware';
import { tenantMiddleware } from '../../../common/middlewares/tenant.middleware';
import { InventoryTransferController } from '../controllers/inventory-transfer.controller';
import { InventoryModuleDependencies } from '../inventory.module';

export const createInventoryTransferRouter = (dependencies: InventoryModuleDependencies) => {
  const router = Router();
  const controller = new InventoryTransferController(dependencies);

  router.use(authMiddleware, tenantMiddleware);

  router.get('/', requirePermission(dependencies.db, 'INVENTORY', 'READ'), controller.listTransfers);
  router.post('/', requirePermission(dependencies.db, 'INVENTORY', 'CREATE'), controller.createTransfer);
  router.get('/:transferId', requirePermission(dependencies.db, 'INVENTORY', 'READ'), controller.getTransferById);
  router.post('/:transferId/complete', requirePermission(dependencies.db, 'INVENTORY', 'UPDATE'), controller.completeTransfer);
  router.post('/:transferId/cancel', requirePermission(dependencies.db, 'INVENTORY', 'UPDATE'), controller.cancelTransfer);

  return router;
};
