import { z } from 'zod';

const uuidSchema = z.uuid();
const returnStatusSchema = z.enum(['DRAFT', 'POSTED', 'CANCELLED']);
const sortDirectionSchema = z.enum(['ASC', 'DESC']);

const purchaseReturnItemSchema = z.object({
  purchaseReceiptItemId: uuidSchema,
  returnedQuantity: z.coerce.number().positive(),
  binId: uuidSchema.nullable().optional(),
});

const salesReturnItemSchema = z.object({
  salesShipmentItemId: uuidSchema,
  returnedQuantity: z.coerce.number().positive(),
  binId: uuidSchema.nullable().optional(),
});

const dateRangeSchema = z
  .object({
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
      ctx.addIssue({
        code: 'custom',
        message: 'dateFrom cannot be after dateTo',
        path: ['dateFrom'],
      });
    }
  });

export const purchaseReturnIdParamSchema = z.object({
  params: z.object({
    purchaseReturnId: uuidSchema,
  }),
});

export const salesReturnIdParamSchema = z.object({
  params: z.object({
    salesReturnId: uuidSchema,
  }),
});

export const createPurchaseReturnSchema = z.object({
  body: z.object({
    purchaseReceiptId: uuidSchema,
    returnDate: z.string().date(),
    notes: z.string().trim().max(2000).nullable().optional(),
    items: z.array(purchaseReturnItemSchema).min(1).max(200),
  }),
});

export const updatePurchaseReturnSchema = z.object({
  params: z.object({
    purchaseReturnId: uuidSchema,
  }),
  body: z.object({
    returnDate: z.string().date().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    items: z.array(purchaseReturnItemSchema).min(1).max(200).optional(),
  }),
});

export const listPurchaseReturnsSchema = z.object({
  query: dateRangeSchema.extend({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(120).optional(),
    status: returnStatusSchema.optional(),
    supplierId: uuidSchema.optional(),
    warehouseId: uuidSchema.optional(),
    purchaseOrderId: uuidSchema.optional(),
    purchaseReceiptId: uuidSchema.optional(),
    purchaseReturnNumber: z.string().trim().min(1).max(80).optional(),
    sortBy: z.enum(['return_date', 'created_at', 'updated_at', 'purchase_return_number']).default('created_at'),
    sortDir: sortDirectionSchema.default('DESC'),
  }),
});

export const createSalesReturnSchema = z.object({
  body: z.object({
    salesShipmentId: uuidSchema,
    returnDate: z.string().date(),
    notes: z.string().trim().max(2000).nullable().optional(),
    items: z.array(salesReturnItemSchema).min(1).max(200),
  }),
});

export const updateSalesReturnSchema = z.object({
  params: z.object({
    salesReturnId: uuidSchema,
  }),
  body: z.object({
    returnDate: z.string().date().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    items: z.array(salesReturnItemSchema).min(1).max(200).optional(),
  }),
});

export const listSalesReturnsSchema = z.object({
  query: dateRangeSchema.extend({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(120).optional(),
    status: returnStatusSchema.optional(),
    customerId: uuidSchema.optional(),
    warehouseId: uuidSchema.optional(),
    salesOrderId: uuidSchema.optional(),
    salesShipmentId: uuidSchema.optional(),
    salesReturnNumber: z.string().trim().min(1).max(80).optional(),
    sortBy: z.enum(['return_date', 'created_at', 'updated_at', 'sales_return_number']).default('created_at'),
    sortDir: sortDirectionSchema.default('DESC'),
  }),
});
