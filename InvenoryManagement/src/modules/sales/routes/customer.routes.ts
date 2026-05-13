import { Router } from 'express';
import { authMiddleware } from '../../../common/middlewares/auth.middleware';
import { requirePermission } from '../../../common/middlewares/rbac.middleware';
import { tenantMiddleware } from '../../../common/middlewares/tenant.middleware';
import { CustomerController } from '../controllers/customer.controller';
import { SalesModuleDependencies } from '../sales.module';

export const createCustomerRouter = (dependencies: SalesModuleDependencies) => {
  const router = Router();
  const controller = new CustomerController(dependencies);

  router.use(authMiddleware, tenantMiddleware);

  router.get('/', requirePermission(dependencies.db, 'CUSTOMERS', 'READ'), controller.listCustomers);
  router.post('/', requirePermission(dependencies.db, 'CUSTOMERS', 'CREATE'), controller.createCustomer);
  router.get('/:customerId', requirePermission(dependencies.db, 'CUSTOMERS', 'READ'), controller.getCustomerById);
  router.put('/:customerId', requirePermission(dependencies.db, 'CUSTOMERS', 'UPDATE'), controller.updateCustomer);
  router.delete('/:customerId', requirePermission(dependencies.db, 'CUSTOMERS', 'DELETE'), controller.deleteCustomer);

  return router;
};
