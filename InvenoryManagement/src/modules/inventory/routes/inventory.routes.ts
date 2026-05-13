import { Router } from 'express';
import { authMiddleware } from '../../../common/middlewares/auth.middleware';
import { requirePermission } from '../../../common/middlewares/rbac.middleware';
import { tenantMiddleware } from '../../../common/middlewares/tenant.middleware';
import { InventoryController } from '../controllers/inventory.controller';
import { InventoryCountController } from '../controllers/inventory-count.controller';
import { InventoryRepository } from '../repositories/inventory.repository';
import { InventoryCountRepository } from '../repositories/inventory-count.repository';
import { WarehouseRepository } from '../../warehouse/repositories/warehouse.repository';
import { InventoryCountService } from '../services/inventory-count.service';
import { InventoryModuleDependencies } from '../inventory.module';

export const createInventoryRouter = (dependencies: InventoryModuleDependencies) => {
  const router = Router();
  const controller = new InventoryController(dependencies);

  // Initialize Inventory Count module
  const countRepo = new InventoryCountRepository(dependencies.db);
  const inventoryRepo = new InventoryRepository(dependencies.db);
  const warehouseRepo = new WarehouseRepository(dependencies.db);
  const countService = new InventoryCountService(
    countRepo, 
    inventoryRepo, 
    warehouseRepo, 
    dependencies.unitOfWork, 
    dependencies.activityService
  );
  const countController = new InventoryCountController(countService);

  router.use(authMiddleware, tenantMiddleware);

  router.get('/warehouses/:warehouseId/stock', requirePermission(dependencies.db, 'INVENTORY', 'READ'), controller.listStock);
  router.get('/warehouses/:warehouseId/movements', requirePermission(dependencies.db, 'INVENTORY', 'READ'), controller.listMovements);
  router.get('/warehouses/:warehouseId/stock/:itemId', requirePermission(dependencies.db, 'INVENTORY', 'READ'), controller.getStockItem);
  router.patch('/warehouses/:warehouseId/stock/:itemId/location', requirePermission(dependencies.db, 'INVENTORY', 'UPDATE'), controller.updateStockLocation);
  router.post('/warehouses/:warehouseId/adjustments', requirePermission(dependencies.db, 'INVENTORY', 'CREATE'), controller.createStockAdjustment);

  // Inventory Count Routes
  router.post('/counts/plans', requirePermission(dependencies.db, 'INVENTORY', 'CREATE'), countController.createCountPlan);
  router.post('/counts/tasks/:taskId/start', requirePermission(dependencies.db, 'INVENTORY', 'UPDATE'), countController.startCountTask);
  router.post('/counts/tasks/:taskId/items/:itemId/confirm', requirePermission(dependencies.db, 'INVENTORY', 'UPDATE'), countController.confirmCountItem);
  router.post('/counts/tasks/:taskId/reconcile', requirePermission(dependencies.db, 'INVENTORY', 'UPDATE'), countController.reconcileCountTask);

  return router;
};
