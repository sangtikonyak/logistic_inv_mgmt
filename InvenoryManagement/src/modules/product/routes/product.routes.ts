import { Router } from 'express';
import { authMiddleware } from '../../../common/middlewares/auth.middleware';
import { tenantMiddleware } from '../../../common/middlewares/tenant.middleware';
import { requirePermission } from '../../../common/middlewares/rbac.middleware';
import { ProductCategoryController } from '../controllers/product-category.controller';
import { ProductController } from '../controllers/product.controller';
import { ProductCustomFieldController } from '../controllers/product-custom-field.controller';
import { ProductAttributeController } from '../controllers/product-attribute.controller';
import { ProductUnitController } from '../controllers/product-unit.controller';
import { ProductModuleDependencies } from '../product.module';

export const createProductRouter = (dependencies: ProductModuleDependencies) => {
  const router = Router();
  const productController = new ProductController(dependencies);
  const categoryController = new ProductCategoryController(dependencies.db);
  const unitController = new ProductUnitController(dependencies.db);
  const customFieldController = new ProductCustomFieldController(dependencies.db);
  const attributeController = new ProductAttributeController(dependencies.db);

  router.use(authMiddleware, tenantMiddleware);

  router.get('/categories', requirePermission(dependencies.db, 'PRODUCTS', 'READ'), categoryController.listCategories);
  router.post('/categories', requirePermission(dependencies.db, 'PRODUCTS', 'CREATE'), categoryController.createCategory);
  router.put('/categories/:categoryId', requirePermission(dependencies.db, 'PRODUCTS', 'UPDATE'), categoryController.updateCategory);
  router.delete(
    '/categories/:categoryId',
    requirePermission(dependencies.db, 'PRODUCTS', 'DELETE'),
    categoryController.deleteCategory
  );

  router.get('/units', requirePermission(dependencies.db, 'PRODUCTS', 'READ'), unitController.listUnits);
  router.post('/units', requirePermission(dependencies.db, 'PRODUCTS', 'CREATE'), unitController.createUnit);
  router.put('/units/:unitId', requirePermission(dependencies.db, 'PRODUCTS', 'UPDATE'), unitController.updateUnit);
  router.delete('/units/:unitId', requirePermission(dependencies.db, 'PRODUCTS', 'DELETE'), unitController.deleteUnit);

  router.get('/custom-fields', requirePermission(dependencies.db, 'PRODUCTS', 'READ'), customFieldController.listDefinitions);
  router.post(
    '/custom-fields',
    requirePermission(dependencies.db, 'PRODUCTS', 'CREATE'),
    customFieldController.createDefinition
  );
  router.put(
    '/custom-fields/:definitionId',
    requirePermission(dependencies.db, 'PRODUCTS', 'UPDATE'),
    customFieldController.updateDefinition
  );
  router.delete(
    '/custom-fields/:definitionId',
    requirePermission(dependencies.db, 'PRODUCTS', 'DELETE'),
    customFieldController.deleteDefinition
  );

  router.get('/:productId/attributes', requirePermission(dependencies.db, 'PRODUCTS', 'READ'), attributeController.listAttributes);
  router.post(
    '/:productId/attributes',
    requirePermission(dependencies.db, 'PRODUCTS', 'CREATE'),
    attributeController.createAttribute
  );
  router.put(
    '/:productId/attributes/:attributeId',
    requirePermission(dependencies.db, 'PRODUCTS', 'UPDATE'),
    attributeController.updateAttribute
  );
  router.delete(
    '/:productId/attributes/:attributeId',
    requirePermission(dependencies.db, 'PRODUCTS', 'DELETE'),
    attributeController.deleteAttribute
  );
  router.post(
    '/:productId/attributes/:attributeId/values',
    requirePermission(dependencies.db, 'PRODUCTS', 'CREATE'),
    attributeController.createAttributeValue
  );
  router.put(
    '/:productId/attributes/:attributeId/values/:valueId',
    requirePermission(dependencies.db, 'PRODUCTS', 'UPDATE'),
    attributeController.updateAttributeValue
  );
  router.delete(
    '/:productId/attributes/:attributeId/values/:valueId',
    requirePermission(dependencies.db, 'PRODUCTS', 'DELETE'),
    attributeController.deleteAttributeValue
  );

  router.get('/', requirePermission(dependencies.db, 'PRODUCTS', 'READ'), productController.listProducts);
  router.post('/', requirePermission(dependencies.db, 'PRODUCTS', 'CREATE'), productController.createProduct);
  router.get('/:productId', requirePermission(dependencies.db, 'PRODUCTS', 'READ'), productController.getProductById);
  router.put('/:productId', requirePermission(dependencies.db, 'PRODUCTS', 'UPDATE'), productController.updateProduct);
  router.delete('/:productId', requirePermission(dependencies.db, 'PRODUCTS', 'DELETE'), productController.deleteProduct);

  return router;
};
