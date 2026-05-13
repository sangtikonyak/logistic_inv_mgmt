import { Router } from 'express';
import { authMiddleware } from '../../../common/middlewares/auth.middleware';
import { requirePermission } from '../../../common/middlewares/rbac.middleware';
import { tenantMiddleware } from '../../../common/middlewares/tenant.middleware';
import { InventoryController } from '../controllers/inventory.controller';
import { InventoryModuleDependencies } from '../inventory.module';

export const createInventoryRouter = (dependencies: InventoryModuleDependencies) => {
  const router = Router();
  const controller = new InventoryController(dependencies);

  router.use(authMiddleware, tenantMiddleware);

  router.get('/warehouses/:warehouseId/stock', requirePermission(dependencies.db, 'INVENTORY', 'READ'), controller.listStock);
  router.get('/warehouses/:warehouseId/movements', requirePermission(dependencies.db, 'INVENTORY', 'READ'), controller.listMovements);
  router.get('/warehouses/:warehouseId/stock/:itemId', requirePermission(dependencies.db, 'INVENTORY', 'READ'), controller.getStockItem);
  router.patch('/warehouses/:warehouseId/stock/:itemId/location', requirePermission(dependencies.db, 'INVENTORY', 'UPDATE'), controller.updateStockLocation);
  router.post('/warehouses/:warehouseId/adjustments', requirePermission(dependencies.db, 'INVENTORY', 'CREATE'), controller.createStockAdjustment);

  return router;
};
