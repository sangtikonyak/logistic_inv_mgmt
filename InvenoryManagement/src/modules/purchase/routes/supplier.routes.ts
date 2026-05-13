import { Router } from 'express';
import { authMiddleware } from '../../../common/middlewares/auth.middleware';
import { requirePermission } from '../../../common/middlewares/rbac.middleware';
import { tenantMiddleware } from '../../../common/middlewares/tenant.middleware';
import { SupplierController } from '../controllers/supplier.controller';
import { PurchaseModuleDependencies } from '../purchase.module';

export const createSupplierRouter = (dependencies: PurchaseModuleDependencies) => {
  const router = Router();
  const controller = new SupplierController(dependencies);

  router.use(authMiddleware, tenantMiddleware);

  router.get('/', requirePermission(dependencies.db, 'SUPPLIERS', 'READ'), controller.listSuppliers);
  router.post('/', requirePermission(dependencies.db, 'SUPPLIERS', 'CREATE'), controller.createSupplier);
  router.get('/:supplierId', requirePermission(dependencies.db, 'SUPPLIERS', 'READ'), controller.getSupplierById);
  router.put('/:supplierId', requirePermission(dependencies.db, 'SUPPLIERS', 'UPDATE'), controller.updateSupplier);
  router.delete('/:supplierId', requirePermission(dependencies.db, 'SUPPLIERS', 'DELETE'), controller.deleteSupplier);

  return router;
};
