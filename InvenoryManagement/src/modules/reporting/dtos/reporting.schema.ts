import { z } from 'zod';

const uuidSchema = z.uuid();
const dateSchema = z.string().date();
const trendGroupBySchema = z.enum(['day', 'week', 'month']);
const limitSchema = z.coerce.number().int().min(1).max(100).default(10);

function withQuery<T extends z.ZodRawShape>(shape: T) {
  return z.object({
    query: z.object(shape),
  });
}

const dateRangeShape = {
  dateFrom: dateSchema.optional(),
  dateTo: dateSchema.optional(),
};

export const dashboardSummarySchema = withQuery({
  ...dateRangeShape,
  warehouseId: uuidSchema.optional(),
});

export const inventoryStockSummarySchema = withQuery({
  ...dateRangeShape,
  warehouseId: uuidSchema.optional(),
  productId: uuidSchema.optional(),
});

export const inventoryMovementSummarySchema = withQuery({
  ...dateRangeShape,
  warehouseId: uuidSchema.optional(),
  productId: uuidSchema.optional(),
  movementType: z.string().trim().min(1).optional(),
  referenceType: z.string().trim().min(1).optional(),
});

export const lowStockSchema = withQuery({
  warehouseId: uuidSchema.optional(),
  productId: uuidSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: limitSchema,
});

export const inventoryValuationSchema = withQuery({
  warehouseId: uuidSchema.optional(),
  productId: uuidSchema.optional(),
});

export const purchaseSummarySchema = withQuery({
  ...dateRangeShape,
  supplierId: uuidSchema.optional(),
  warehouseId: uuidSchema.optional(),
  status: z.string().trim().min(1).optional(),
});

export const purchasesBySupplierSchema = withQuery({
  ...dateRangeShape,
  supplierId: uuidSchema.optional(),
  limit: limitSchema,
});

export const purchaseReceiptsTrendSchema = withQuery({
  ...dateRangeShape,
  supplierId: uuidSchema.optional(),
  warehouseId: uuidSchema.optional(),
  groupBy: trendGroupBySchema.default('month'),
});

export const salesSummarySchema = withQuery({
  ...dateRangeShape,
  customerId: uuidSchema.optional(),
  warehouseId: uuidSchema.optional(),
  status: z.string().trim().min(1).optional(),
});

export const salesByCustomerSchema = withQuery({
  ...dateRangeShape,
  customerId: uuidSchema.optional(),
  limit: limitSchema,
});

export const salesOrdersTrendSchema = withQuery({
  ...dateRangeShape,
  customerId: uuidSchema.optional(),
  warehouseId: uuidSchema.optional(),
  groupBy: trendGroupBySchema.default('month'),
});

export const salesShipmentsTrendSchema = withQuery({
  ...dateRangeShape,
  customerId: uuidSchema.optional(),
  warehouseId: uuidSchema.optional(),
  groupBy: trendGroupBySchema.default('month'),
});

export const salesReservationsTrendSchema = withQuery({
  ...dateRangeShape,
  customerId: uuidSchema.optional(),
  warehouseId: uuidSchema.optional(),
  groupBy: trendGroupBySchema.default('month'),
});

export const returnsSummarySchema = withQuery({
  ...dateRangeShape,
  warehouseId: uuidSchema.optional(),
  supplierId: uuidSchema.optional(),
  customerId: uuidSchema.optional(),
});

export const returnsTrendSchema = withQuery({
  ...dateRangeShape,
  warehouseId: uuidSchema.optional(),
  supplierId: uuidSchema.optional(),
  customerId: uuidSchema.optional(),
  groupBy: trendGroupBySchema.default('month'),
});

export const warehouseSummarySchema = withQuery({
  ...dateRangeShape,
  warehouseId: uuidSchema.optional(),
});

export const warehouseUtilizationSchema = withQuery({
  ...dateRangeShape,
  warehouseId: uuidSchema.optional(),
});

export const topSellingProductsSchema = withQuery({
  ...dateRangeShape,
  warehouseId: uuidSchema.optional(),
  customerId: uuidSchema.optional(),
  limit: limitSchema,
});

export const topPurchasedProductsSchema = withQuery({
  ...dateRangeShape,
  warehouseId: uuidSchema.optional(),
  supplierId: uuidSchema.optional(),
  limit: limitSchema,
});

export const nonMovingProductsSchema = withQuery({
  ...dateRangeShape,
  warehouseId: uuidSchema.optional(),
  limit: limitSchema,
});
