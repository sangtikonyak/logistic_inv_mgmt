import { pool, unitOfWork } from './src/database/mysql';
import { ProductService } from './src/modules/product/services/product.service';

async function repro() {
  const productService = new ProductService(pool, unitOfWork);
  const tenantId = '1527726e-42da-43eb-b656-17ecf5870cf5'; // Sangti Logistics
  const userId = 'repro-user';

  try {
    console.log('Attempting to create a product...');
    const result = await productService.createProduct(tenantId, userId, {
      name: 'Repro Product ' + Date.now(),
      productType: 'SIMPLE',
      status: 'ACTIVE',
      isSellable: true,
      isPurchasable: true,
      trackInventory: true,
      allowReturns: true,
      allowBackorder: false,
      costPrice: 10,
      sellingPrice: 20,
      currencyCode: 'USD',
      categoryIds: []
    });
    console.log('Success:', result.id);
  } catch (error: any) {
    console.error('FAILED with error:');
    console.error(error);
    if (error.sql) {
        console.error('SQL:', error.sql);
    }
  } finally {
    process.exit(0);
  }
}

repro();
