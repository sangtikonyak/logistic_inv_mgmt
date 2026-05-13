import { Router } from 'express';
import { authMiddleware } from '../../../common/middlewares/auth.middleware';
import { requirePermission } from '../../../common/middlewares/rbac.middleware';
import { tenantMiddleware } from '../../../common/middlewares/tenant.middleware';
import { PurchaseReturnController } from '../controllers/purchase-return.controller';
import { SalesReturnController } from '../controllers/sales-return.controller';
import { ReturnsModuleDependencies } from '../returns.module';

export const createReturnsRouter = (dependencies: ReturnsModuleDependencies) => {
  const router = Router();
  const purchaseController = new PurchaseReturnController(dependencies);
  const salesController = new SalesReturnController(dependencies);

  router.use(authMiddleware, tenantMiddleware);

  router.get('/purchase', requirePermission(dependencies.db, 'RETURNS', 'READ'), purchaseController.listPurchaseReturns);
  router.post('/purchase', requirePermission(dependencies.db, 'RETURNS', 'CREATE'), purchaseController.createPurchaseReturn);
  router.get('/purchase/:purchaseReturnId', requirePermission(dependencies.db, 'RETURNS', 'READ'), purchaseController.getPurchaseReturnById);
  router.put('/purchase/:purchaseReturnId', requirePermission(dependencies.db, 'RETURNS', 'UPDATE'), purchaseController.updatePurchaseReturn);
  router.post('/purchase/:purchaseReturnId/post', requirePermission(dependencies.db, 'RETURNS', 'UPDATE'), purchaseController.postPurchaseReturn);
  router.post('/purchase/:purchaseReturnId/cancel', requirePermission(dependencies.db, 'RETURNS', 'UPDATE'), purchaseController.cancelPurchaseReturn);

  router.get('/sales', requirePermission(dependencies.db, 'RETURNS', 'READ'), salesController.listSalesReturns);
  router.post('/sales', requirePermission(dependencies.db, 'RETURNS', 'CREATE'), salesController.createSalesReturn);
  router.get('/sales/:salesReturnId', requirePermission(dependencies.db, 'RETURNS', 'READ'), salesController.getSalesReturnById);
  router.put('/sales/:salesReturnId', requirePermission(dependencies.db, 'RETURNS', 'UPDATE'), salesController.updateSalesReturn);
  router.post('/sales/:salesReturnId/post', requirePermission(dependencies.db, 'RETURNS', 'UPDATE'), salesController.postSalesReturn);
  router.post('/sales/:salesReturnId/cancel', requirePermission(dependencies.db, 'RETURNS', 'UPDATE'), salesController.cancelSalesReturn);

  return router;
};
