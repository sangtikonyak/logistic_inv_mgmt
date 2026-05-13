import { Router } from 'express';
import { authMiddleware } from '../../../common/middlewares/auth.middleware';
import { requirePermission } from '../../../common/middlewares/rbac.middleware';
import { tenantMiddleware } from '../../../common/middlewares/tenant.middleware';
import { WarehouseController } from '../controllers/warehouse.controller';
import { WmsExecutionController } from '../controllers/wms-execution.controller';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { PurchaseRepository } from '../../purchase/repositories/purchase.repository';
import { SalesRepository } from '../../sales/repositories/sales.repository';
import { WmsExecutionService } from '../services/wms-execution.service';
import { WarehouseModuleDependencies } from '../warehouse.module';

export const createWarehouseRouter = (dependencies: WarehouseModuleDependencies) => {
  const router = Router();
  const controller = new WarehouseController(dependencies);

  router.use(authMiddleware, tenantMiddleware);

  // Initialize WMS Execution
  const warehouseRepo = new WarehouseRepository(dependencies.db);
  const salesRepo = new SalesRepository(dependencies.db);
  const purchaseRepo = new PurchaseRepository(dependencies.db);
  const wmsService = new WmsExecutionService(warehouseRepo, salesRepo, purchaseRepo, dependencies.unitOfWork);
  const wmsController = new WmsExecutionController(wmsService);

  // WMS Execution Routes
  router.get('/picklists', requirePermission(dependencies.db, 'WAREHOUSES', 'READ'), wmsController.listPicklists);
  router.get('/picklists/:picklistId', requirePermission(dependencies.db, 'WAREHOUSES', 'READ'), wmsController.getPicklistById);
  router.post('/picklists/:picklistId/assign', requirePermission(dependencies.db, 'WAREHOUSES', 'UPDATE'), wmsController.assignPicklist);
  router.post('/picklists/:picklistId/start', requirePermission(dependencies.db, 'WAREHOUSES', 'UPDATE'), wmsController.startPicking);
  router.post('/picklists/:picklistId/items/:itemId/confirm', requirePermission(dependencies.db, 'WAREHOUSES', 'UPDATE'), wmsController.confirmPickItem);
  router.post('/picklists/:picklistId/complete', requirePermission(dependencies.db, 'WAREHOUSES', 'UPDATE'), wmsController.completePicklist);

  router.get('/', requirePermission(dependencies.db, 'WAREHOUSES', 'READ'), controller.listWarehouses);
  router.post('/', requirePermission(dependencies.db, 'WAREHOUSES', 'CREATE'), controller.createWarehouse);
  router.get('/:warehouseId', requirePermission(dependencies.db, 'WAREHOUSES', 'READ'), controller.getWarehouseById);
  router.put('/:warehouseId', requirePermission(dependencies.db, 'WAREHOUSES', 'UPDATE'), controller.updateWarehouse);
  router.delete('/:warehouseId', requirePermission(dependencies.db, 'WAREHOUSES', 'DELETE'), controller.deleteWarehouse);
  router.patch('/:warehouseId/default', requirePermission(dependencies.db, 'WAREHOUSES', 'UPDATE'), controller.setDefaultWarehouse);

  router.get('/:warehouseId/zones', requirePermission(dependencies.db, 'WAREHOUSES', 'READ'), controller.listZones);
  router.post('/:warehouseId/zones', requirePermission(dependencies.db, 'WAREHOUSES', 'CREATE'), controller.createZone);

  router.put('/zones/:zoneId', requirePermission(dependencies.db, 'WAREHOUSES', 'UPDATE'), controller.updateZone);
  router.delete('/zones/:zoneId', requirePermission(dependencies.db, 'WAREHOUSES', 'DELETE'), controller.deleteZone);

  router.get('/zones/:zoneId/bins', requirePermission(dependencies.db, 'WAREHOUSES', 'READ'), controller.listBins);
  router.post('/zones/:zoneId/bins', requirePermission(dependencies.db, 'WAREHOUSES', 'CREATE'), controller.createBin);

  router.put('/bins/:binId', requirePermission(dependencies.db, 'WAREHOUSES', 'UPDATE'), controller.updateBin);
  router.delete('/bins/:binId', requirePermission(dependencies.db, 'WAREHOUSES', 'DELETE'), controller.deleteBin);

  return router;
};
