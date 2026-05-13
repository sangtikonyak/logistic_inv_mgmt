import { z } from 'zod';

const uuidSchema = z.uuid();
const statusSchema = z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']);
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

const nullableTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .nullable()
    .optional();

const requiredTrimmedString = (max: number) => z.string().trim().min(1).max(max);

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

export const createWarehouseSchema = z.object({
  body: z.object({
    name: requiredTrimmedString(160),
    code: requiredTrimmedString(60),
    status: statusSchema.default('ACTIVE'),
    isDefault: z.boolean().optional(),
    addressLine1: nullableTrimmedString(255),
    addressLine2: nullableTrimmedString(255),
    city: nullableTrimmedString(120),
    state: nullableTrimmedString(120),
    postalCode: nullableTrimmedString(40),
    country: nullableTrimmedString(120),
    latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
    longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  }),
});

export const updateWarehouseSchema = z.object({
  params: z.object({
    warehouseId: uuidSchema,
  }),
  body: z.object({
    name: requiredTrimmedString(160).optional(),
    code: requiredTrimmedString(60).optional(),
    status: statusSchema.optional(),
    isDefault: z.boolean().optional(),
    addressLine1: nullableTrimmedString(255),
    addressLine2: nullableTrimmedString(255),
    city: nullableTrimmedString(120),
    state: nullableTrimmedString(120),
    postalCode: nullableTrimmedString(40),
    country: nullableTrimmedString(120),
    latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
    longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  }),
});

export const warehouseIdParamSchema = z.object({
  params: z.object({
    warehouseId: uuidSchema,
  }),
});

export const listWarehousesSchema = z.object({
  query: z.object({
    search: z.string().trim().min(1).max(120).optional(),
    status: statusSchema.optional(),
    isDefault: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(['created_at', 'updated_at', 'name', 'code']).default('created_at'),
    sortDir: z.enum(['ASC', 'DESC']).default('DESC'),
  }),
});

export const createZoneSchema = z.object({
  params: z.object({
    warehouseId: uuidSchema,
  }),
  body: z.object({
    name: requiredTrimmedString(160),
    code: requiredTrimmedString(60),
    sortOrder: z.coerce.number().int().min(0).default(0),
  }),
});

export const listZonesSchema = z.object({
  params: z.object({
    warehouseId: uuidSchema,
  }),
});

export const zoneIdParamSchema = z.object({
  params: z.object({
    zoneId: uuidSchema,
  }),
});

export const updateZoneSchema = z.object({
  params: z.object({
    zoneId: uuidSchema,
  }),
  body: z.object({
    name: requiredTrimmedString(160).optional(),
    code: requiredTrimmedString(60).optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  }),
});

export const createBinSchema = z.object({
  params: z.object({
    zoneId: uuidSchema,
  }),
  body: z.object({
    name: requiredTrimmedString(160),
    code: requiredTrimmedString(60),
    sortOrder: z.coerce.number().int().min(0).default(0),
    isPickable: z.boolean().default(true),
    isReceiving: z.boolean().default(false),
    isDispatch: z.boolean().default(false),
  }),
});

export const listBinsSchema = z.object({
  params: z.object({
    zoneId: uuidSchema,
  }),
});

export const binIdParamSchema = z.object({
  params: z.object({
    binId: uuidSchema,
  }),
});

export const updateBinSchema = z.object({
  params: z.object({
    binId: uuidSchema,
  }),
  body: z.object({
    name: requiredTrimmedString(160).optional(),
    code: requiredTrimmedString(60).optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
    isPickable: z.boolean().optional(),
    isReceiving: z.boolean().optional(),
    isDispatch: z.boolean().optional(),
  }),
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
    limit: z.coerce.number().int().min(1).max(100).default(20),
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
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const stockItemParamSchema = z.object({
  params: z.object({
    warehouseId: uuidSchema,
    itemId: uuidSchema,
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
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const transferIdParamSchema = z.object({
  params: z.object({
    transferId: uuidSchema,
  }),
});
