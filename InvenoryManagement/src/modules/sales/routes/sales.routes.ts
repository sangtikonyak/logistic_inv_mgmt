import { Router } from 'express';
import { authMiddleware } from '../../../common/middlewares/auth.middleware';
import { requirePermission } from '../../../common/middlewares/rbac.middleware';
import { tenantMiddleware } from '../../../common/middlewares/tenant.middleware';
import { SalesController } from '../controllers/sales.controller';
import { SalesModuleDependencies } from '../sales.module';

export const createSalesRouter = (dependencies: SalesModuleDependencies) => {
  const router = Router();
  const controller = new SalesController(dependencies);

  router.use(authMiddleware, tenantMiddleware);

  router.get('/orders', requirePermission(dependencies.db, 'SALES', 'READ'), controller.listSalesOrders);
  router.post('/orders', requirePermission(dependencies.db, 'SALES', 'CREATE'), controller.createSalesOrder);
  router.get('/orders/:salesOrderId', requirePermission(dependencies.db, 'SALES', 'READ'), controller.getSalesOrderById);
  router.put('/orders/:salesOrderId', requirePermission(dependencies.db, 'SALES', 'UPDATE'), controller.updateSalesOrder);
  router.post('/orders/:salesOrderId/confirm', requirePermission(dependencies.db, 'SALES', 'UPDATE'), controller.confirmSalesOrder);
  router.post('/orders/:salesOrderId/cancel', requirePermission(dependencies.db, 'SALES', 'UPDATE'), controller.cancelSalesOrder);

  router.get('/reservations', requirePermission(dependencies.db, 'SALES', 'READ'), controller.listSalesReservations);
  router.post('/orders/:salesOrderId/reservations', requirePermission(dependencies.db, 'SALES', 'CREATE'), controller.createSalesReservation);
  router.get('/reservations/:reservationId', requirePermission(dependencies.db, 'SALES', 'READ'), controller.getSalesReservationById);
  router.post('/reservations/:reservationId/post', requirePermission(dependencies.db, 'SALES', 'UPDATE'), controller.postSalesReservation);
  router.post(
    '/reservations/:reservationId/release',
    requirePermission(dependencies.db, 'SALES', 'UPDATE'),
    controller.releaseSalesReservation
  );
  router.post(
    '/reservations/:reservationId/cancel',
    requirePermission(dependencies.db, 'SALES', 'UPDATE'),
    controller.cancelSalesReservation
  );

  router.get('/shipments', requirePermission(dependencies.db, 'SALES', 'READ'), controller.listSalesShipments);
  router.post('/orders/:salesOrderId/shipments', requirePermission(dependencies.db, 'SALES', 'CREATE'), controller.createSalesShipment);
  router.get('/shipments/:shipmentId', requirePermission(dependencies.db, 'SALES', 'READ'), controller.getSalesShipmentById);
  router.post('/shipments/:shipmentId/post', requirePermission(dependencies.db, 'SALES', 'UPDATE'), controller.postSalesShipment);
  router.post('/shipments/:shipmentId/cancel', requirePermission(dependencies.db, 'SALES', 'UPDATE'), controller.cancelSalesShipment);

  return router;
};
