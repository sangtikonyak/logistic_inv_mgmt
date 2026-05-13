import { Router } from 'express';
import { authMiddleware } from '../../../common/middlewares/auth.middleware';
import { requirePermission } from '../../../common/middlewares/rbac.middleware';
import { tenantMiddleware } from '../../../common/middlewares/tenant.middleware';
import { WarehouseController } from '../controllers/warehouse.controller';
import { WarehouseModuleDependencies } from '../warehouse.module';

export const createWarehouseRouter = (dependencies: WarehouseModuleDependencies) => {
  const router = Router();
  const controller = new WarehouseController(dependencies);

  router.use(authMiddleware, tenantMiddleware);

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
