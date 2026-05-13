import { Router } from 'express';
import { authMiddleware } from '../../../common/middlewares/auth.middleware';
import { requirePermission } from '../../../common/middlewares/rbac.middleware';
import { tenantMiddleware } from '../../../common/middlewares/tenant.middleware';
import { ReportingController } from '../controllers/reporting.controller';
import { ReportingModuleDependencies } from '../reporting.module';

export const createReportingRouter = (dependencies: ReportingModuleDependencies) => {
  const router = Router();
  const controller = new ReportingController(dependencies);

  router.use(authMiddleware, tenantMiddleware, requirePermission(dependencies.db, 'REPORTS', 'READ'));

  router.get('/dashboard/summary', controller.getDashboardSummary);
  router.get('/dashboard/activities', controller.getDashboardActivities);
  router.get('/inventory/stock-summary', controller.getInventoryStockSummary);
  router.get('/inventory/movement-summary', controller.getInventoryMovementSummary);
  router.get('/inventory/low-stock', controller.getLowStockReport);
  router.get('/inventory/valuation', controller.getInventoryValuation);

  router.get('/purchases/summary', controller.getPurchaseSummary);
  router.get('/purchases/by-supplier', controller.getPurchasesBySupplier);
  router.get('/purchases/receipts-trend', controller.getPurchaseReceiptsTrend);

  router.get('/sales/summary', controller.getSalesSummary);
  router.get('/sales/by-customer', controller.getSalesByCustomer);
  router.get('/sales/orders-trend', controller.getSalesOrdersTrend);
  router.get('/sales/shipments-trend', controller.getSalesShipmentsTrend);
  router.get('/sales/reservations-trend', controller.getSalesReservationsTrend);

  router.get('/returns/summary', controller.getReturnsSummary);
  router.get('/returns/trend', controller.getReturnsTrend);

  router.get('/warehouses/summary', controller.getWarehouseSummary);
  router.get('/warehouses/utilization', controller.getWarehouseUtilization);

  router.get('/products/top-selling', controller.getTopSellingProducts);
  router.get('/products/top-purchased', controller.getTopPurchasedProducts);
  router.get('/products/non-moving', controller.getNonMovingProducts);

  return router;
};
