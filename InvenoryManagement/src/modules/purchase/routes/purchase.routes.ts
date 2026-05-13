import { Router } from 'express';
import { authMiddleware } from '../../../common/middlewares/auth.middleware';
import { requirePermission } from '../../../common/middlewares/rbac.middleware';
import { tenantMiddleware } from '../../../common/middlewares/tenant.middleware';
import { PurchaseController } from '../controllers/purchase.controller';
import { PurchaseModuleDependencies } from '../purchase.module';

export const createPurchaseRouter = (dependencies: PurchaseModuleDependencies) => {
  const router = Router();
  const controller = new PurchaseController(dependencies);

  router.use(authMiddleware, tenantMiddleware);

  router.get('/orders', requirePermission(dependencies.db, 'PURCHASES', 'READ'), controller.listPurchaseOrders);
  router.post('/orders', requirePermission(dependencies.db, 'PURCHASES', 'CREATE'), controller.createPurchaseOrder);
  router.get('/orders/:purchaseOrderId', requirePermission(dependencies.db, 'PURCHASES', 'READ'), controller.getPurchaseOrderById);
  router.put('/orders/:purchaseOrderId', requirePermission(dependencies.db, 'PURCHASES', 'UPDATE'), controller.updatePurchaseOrder);
  router.post('/orders/:purchaseOrderId/submit-for-approval', requirePermission(dependencies.db, 'PURCHASES', 'UPDATE'), controller.submitForApproval);
  router.post('/orders/:purchaseOrderId/approve', requirePermission(dependencies.db, 'PURCHASES', 'UPDATE'), controller.approve);
  router.post('/orders/:purchaseOrderId/reject', requirePermission(dependencies.db, 'PURCHASES', 'UPDATE'), controller.reject);
  router.post('/orders/:purchaseOrderId/issue', requirePermission(dependencies.db, 'PURCHASES', 'UPDATE'), controller.issuePurchaseOrder);
  router.post('/orders/:purchaseOrderId/cancel', requirePermission(dependencies.db, 'PURCHASES', 'UPDATE'), controller.cancelPurchaseOrder);

  router.get('/receipts', requirePermission(dependencies.db, 'PURCHASES', 'READ'), controller.listPurchaseReceipts);
  router.post('/orders/:purchaseOrderId/receipts', requirePermission(dependencies.db, 'PURCHASES', 'CREATE'), controller.createPurchaseReceipt);
  router.get('/receipts/:receiptId', requirePermission(dependencies.db, 'PURCHASES', 'READ'), controller.getPurchaseReceiptById);
  router.post('/receipts/:receiptId/post', requirePermission(dependencies.db, 'PURCHASES', 'UPDATE'), controller.postPurchaseReceipt);
  router.post('/receipts/:receiptId/cancel', requirePermission(dependencies.db, 'PURCHASES', 'UPDATE'), controller.cancelPurchaseReceipt);

  return router;
};
