import { z } from 'zod';

const uuidSchema = z.uuid();
const transferStatusSchema = z.enum(['DRAFT', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED']);
const movementTypeSchema = z.enum([
  'OPENING',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'TRANSFER_OUT',
  'TRANSFER_IN',
  'RECEIPT',
  'ISSUE',
  'RESERVATION',
  'RESERVATION_RELEASE',
]);

const transferItemSchema = z
  .object({
    productId: uuidSchema.optional(),
    productVariantId: uuidSchema.optional(),
    quantity: z.coerce.number().positive(),
    sourceBinId: uuidSchema.nullable().optional(),
    destinationBinId: uuidSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    const presentCount = Number(Boolean(value.productId)) + Number(Boolean(value.productVariantId));
    if (presentCount !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Each transfer item must include either productId or productVariantId',
        path: ['productId'],
      });
    }
  });

export const listStockSchema = z.object({
  params: z.object({
    warehouseId: uuidSchema,
  }),
  query: z.object({
    search: z.string().trim().min(1).max(120).optional(),
    zoneId: uuidSchema.optional(),
    binId: uuidSchema.optional(),
    productId: uuidSchema.optional(),
    productVariantId: uuidSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
      .number()
      .int()
      .refine((value) => [20, 50, 100].includes(value), 'Limit must be one of 20, 50, or 100')
      .default(20),
  }),
});

export const listMovementsSchema = z.object({
  params: z.object({
    warehouseId: uuidSchema,
  }),
  query: z.object({
    movementType: movementTypeSchema.optional(),
    productId: uuidSchema.optional(),
    productVariantId: uuidSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
      .number()
      .int()
      .refine((value) => [20, 50, 100].includes(value), 'Limit must be one of 20, 50, or 100')
      .default(20),
  }),
});

export const stockItemParamSchema = z.object({
  params: z.object({
    warehouseId: uuidSchema,
    itemId: uuidSchema,
  }),
});

export const updateStockLocationSchema = z.object({
  params: z.object({
    warehouseId: uuidSchema,
    itemId: uuidSchema,
  }),
  body: z.object({
    zoneId: uuidSchema.nullable().optional(),
    binId: uuidSchema.nullable().optional(),
  }),
});

export const createStockAdjustmentSchema = z
  .object({
    params: z.object({
      warehouseId: uuidSchema,
    }),
    body: z.object({
      productId: uuidSchema.optional(),
      productVariantId: uuidSchema.optional(),
      zoneId: uuidSchema.nullable().optional(),
      binId: uuidSchema.nullable().optional(),
      adjustmentType: z.enum(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT']),
      quantity: z.coerce.number().positive(),
      notes: z.string().trim().max(2000).nullable().optional(),
    }),
  })
  .superRefine((value, ctx) => {
    const count = Number(Boolean(value.body.productId)) + Number(Boolean(value.body.productVariantId));
    if (count !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide either productId or productVariantId',
        path: ['body', 'productId'],
      });
    }
  });

export const createTransferSchema = z.object({
  body: z.object({
    sourceWarehouseId: uuidSchema,
    destinationWarehouseId: uuidSchema,
    notes: z.string().trim().max(2000).nullable().optional(),
    items: z.array(transferItemSchema).min(1).max(100),
  }),
});

export const listTransfersSchema = z.object({
  query: z.object({
    status: transferStatusSchema.optional(),
    sourceWarehouseId: uuidSchema.optional(),
    destinationWarehouseId: uuidSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
      .number()
      .int()
      .refine((value) => [20, 50, 100].includes(value), 'Limit must be one of 20, 50, or 100')
      .default(20),
  }),
});

export const transferIdParamSchema = z.object({
  params: z.object({
    transferId: uuidSchema,
  }),
});
