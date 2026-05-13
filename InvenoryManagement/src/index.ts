import express from 'express';
import { createAuthRouter } from './modules/auth/routes/auth.routes';
import { errorHandler } from './common/exceptions/error-handler';
import { db, unitOfWork } from './database/mysql';
import { env } from './config/env';
import { createInventoryRouter } from './modules/inventory/routes/inventory.routes';
import { createInventoryTransferRouter } from './modules/inventory/routes/inventory-transfer.routes';
import { createProductRouter } from './modules/product/routes/product.routes';
import { createPurchaseRouter } from './modules/purchase/routes/purchase.routes';
import { createSupplierRouter } from './modules/purchase/routes/supplier.routes';
import { createCustomerRouter } from './modules/sales/routes/customer.routes';
import { createSalesRouter } from './modules/sales/routes/sales.routes';
import { createWarehouseRouter } from './modules/warehouse/routes/warehouse.routes';
import { createReturnsRouter } from './modules/returns/routes/returns.routes';
import { createReportingRouter } from './modules/reporting/routes/reporting.routes';
import { createReplenishmentRouter } from './modules/replenishment/routes/replenishment.routes';
import { createProcurementRouter } from './modules/procurement/routes/procurement.routes';
import { setupLogisticsRoutes } from './modules/logistics/routes/logistics.routes';
import { setupFinanceRoutes } from './modules/finance/routes/finance.routes';
import { ActivityService } from './modules/activity/services/activity.service';

const app = express();
const PORT = env.PORT;

const activityService = new ActivityService(db);

const allowedOrigins = new Set(
  [
    env.FRONTEND_ORIGIN,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ].filter(Boolean),
);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }

  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// Middleware for parsing JSON requests
app.use(express.json());

// Main App Routes
app.use('/api/v1/auth', createAuthRouter({ db, unitOfWork, activityService }));
app.use('/api/v1/products', createProductRouter({ db, unitOfWork, activityService }));
app.use('/api/v1/warehouses', createWarehouseRouter({ db, unitOfWork, activityService }));
app.use('/api/v1/inventory', createInventoryRouter({ db, unitOfWork, activityService }));
app.use('/api/v1/inventory/transfers', createInventoryTransferRouter({ db, unitOfWork, activityService }));
app.use('/api/v1/suppliers', createSupplierRouter({ db, unitOfWork, activityService }));
app.use('/api/v1/purchases', createPurchaseRouter({ db, unitOfWork, activityService }));
app.use('/api/v1/customers', createCustomerRouter({ db, unitOfWork, activityService }));
app.use('/api/v1/sales', createSalesRouter({ db, unitOfWork, activityService }));
app.use('/api/v1/returns', createReturnsRouter({ db, unitOfWork, activityService }));
app.use('/api/v1/reports', createReportingRouter({ db, unitOfWork, activityService }));
app.use('/api/v1/replenishment', createReplenishmentRouter({ db, unitOfWork, activityService }));
app.use('/api/v1/procurement', createProcurementRouter({ db, unitOfWork, activityService }));
app.use('/api/v1/logistics', setupLogisticsRoutes({ db, unitOfWork }));
app.use('/api/v1/finance', setupFinanceRoutes({ db, unitOfWork }));

// Global Error Handler (Must be registered last)
app.use(errorHandler);

// Only start the server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
