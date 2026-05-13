import { pool, unitOfWork } from './src/database/mysql';
import { ProductService } from './src/modules/product/services/product.service';

async function repro() {
  const productService = new ProductService(pool, unitOfWork);
  const tenantId = '1527726e-42da-43eb-b656-17ecf5870cf5'; // Sangti Logistics
  const userId = '11111111-1111-1111-1111-111111111111';

  try {
    console.log('Attempting to create a product with FULL payload...');
    const result = await productService.createProduct(tenantId, userId, {
      name: 'Full Repro Product ' + Date.now(),
      productType: 'VARIABLE',
      status: 'ACTIVE',
      isSellable: true,
      isPurchasable: true,
      trackInventory: true,
      allowReturns: true,
      allowBackorder: false,
      costPrice: 10,
      sellingPrice: 20,
      currencyCode: 'USD',
      categoryIds: [],
      variants: [
        {
          name: 'Red',
          sku: 'REPRO-RED-' + Date.now(),
          attributes: [{ name: 'Color', value: 'Red' }]
        }
      ],
      openingStock: {
          warehouseId: 'c9a1f0d5-f58f-4154-9ae8-80031340806d',
          quantity: 100
      }
    });
    console.log('Success:', result.id);
  } catch (error: any) {
    console.error('FAILED with error:');
    console.error(error);
    if (error.sql) {
        console.error('SQL:', error.sql);
        console.error('Params:', error.parameters);
    }
  } finally {
    process.exit(0);
  }
}

repro();
