import { z } from 'zod';
import { PAYMENT_MODE_VALUES, PAYMENT_STATUS_VALUES, PAYMENT_TYPE_VALUES } from '../../../common/constants/payment';

const uuidSchema = z.uuid();
const moneySchema = z.coerce.number().min(0);
const paymentTypeSchema = z.enum(PAYMENT_TYPE_VALUES);
const paymentStatusSchema = z.enum(PAYMENT_STATUS_VALUES);
const paymentModeSchema = z.enum(PAYMENT_MODE_VALUES);

const purchaseOrderItemSchema = z
  .object({
    productId: uuidSchema.optional(),
    productVariantId: uuidSchema.optional(),
    orderedQuantity: z.coerce.number().positive(),
    unitCost: moneySchema.default(0),
    taxAmount: moneySchema.default(0),
    discountAmount: moneySchema.default(0),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    const count = Number(Boolean(value.productId)) + Number(Boolean(value.productVariantId));
    if (count !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Each purchase item must include either productId or productVariantId',
        path: ['productId'],
      });
    }
  });

const purchaseReceiptItemSchema = z.object({
  purchaseOrderItemId: uuidSchema,
  receivedQuantity: z.coerce.number().positive(),
  acceptedQuantity: z.coerce.number().nonnegative().optional(),
  rejectedQuantity: z.coerce.number().nonnegative().optional(),
  binId: uuidSchema.nullable().optional(),
  lotNumber: z.string().trim().min(1).max(120).nullable().optional(),
  expiryDate: z.string().date().nullable().optional(),
  containerCode: z.string().trim().min(1).max(120).nullable().optional(),
  unitCost: moneySchema.optional(),
}).superRefine((value, ctx) => {
  const accepted = value.acceptedQuantity ?? value.receivedQuantity;
  const rejected = value.rejectedQuantity ?? 0;
  if (Math.abs((accepted + rejected) - value.receivedQuantity) > 0.0001) {
    ctx.addIssue({
      code: 'custom',
      message: 'acceptedQuantity + rejectedQuantity must equal receivedQuantity.',
      path: ['acceptedQuantity'],
    });
  }
});

export const supplierIdParamSchema = z.object({
  params: z.object({
    supplierId: uuidSchema,
  }),
});

export const purchaseOrderIdParamSchema = z.object({
  params: z.object({
    purchaseOrderId: uuidSchema,
  }),
});

export const receiptIdParamSchema = z.object({
  params: z.object({
    receiptId: uuidSchema,
  }),
});

export const createSupplierSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(160),
    code: z.string().trim().min(1).max(60),
    email: z.string().trim().email().max(190).nullable().optional(),
    phone: z.string().trim().min(1).max(50).nullable().optional(),
    contactPerson: z.string().trim().min(1).max(120).nullable().optional(),
    taxNumber: z.string().trim().min(1).max(80).nullable().optional(),
    addressLine1: z.string().trim().min(1).max(255).nullable().optional(),
    addressLine2: z.string().trim().min(1).max(255).nullable().optional(),
    city: z.string().trim().min(1).max(120).nullable().optional(),
    state: z.string().trim().min(1).max(120).nullable().optional(),
    postalCode: z.string().trim().min(1).max(40).nullable().optional(),
    country: z.string().trim().min(1).max(120).nullable().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).default('ACTIVE'),
    notes: z.string().trim().max(2000).nullable().optional(),
  }),
});

export const updateSupplierSchema = z.object({
  params: z.object({
    supplierId: uuidSchema,
  }),
  body: z.object({
    name: z.string().trim().min(1).max(160).optional(),
    code: z.string().trim().min(1).max(60).optional(),
    email: z.string().trim().email().max(190).nullable().optional(),
    phone: z.string().trim().min(1).max(50).nullable().optional(),
    contactPerson: z.string().trim().min(1).max(120).nullable().optional(),
    taxNumber: z.string().trim().min(1).max(80).nullable().optional(),
    addressLine1: z.string().trim().min(1).max(255).nullable().optional(),
    addressLine2: z.string().trim().min(1).max(255).nullable().optional(),
    city: z.string().trim().min(1).max(120).nullable().optional(),
    state: z.string().trim().min(1).max(120).nullable().optional(),
    postalCode: z.string().trim().min(1).max(40).nullable().optional(),
    country: z.string().trim().min(1).max(120).nullable().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  }),
});

export const listSuppliersSchema = z.object({
  query: z.object({
    search: z.string().trim().min(1).max(120).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(['created_at', 'updated_at', 'name', 'code']).default('created_at'),
    sortDir: z.enum(['ASC', 'DESC']).default('DESC'),
  }),
});

export const createPurchaseOrderSchema = z.object({
  body: z.object({
    supplierId: uuidSchema,
    warehouseId: uuidSchema,
    orderDate: z.string().date(),
    expectedDate: z.string().date().nullable().optional(),
    currencyCode: z.string().trim().length(3).nullable().optional(),
    paymentType: paymentTypeSchema.default('NOT_APPLICABLE'),
    paymentStatus: paymentStatusSchema.default('NOT_APPLICABLE'),
    paymentMode: paymentModeSchema.default('NOT_APPLICABLE'),
    notes: z.string().trim().max(2000).nullable().optional(),
    items: z.array(purchaseOrderItemSchema).min(1).max(200),
  }),
});

export const updatePurchaseOrderSchema = z.object({
  params: z.object({
    purchaseOrderId: uuidSchema,
  }),
  body: z.object({
    supplierId: uuidSchema.optional(),
    warehouseId: uuidSchema.optional(),
    orderDate: z.string().date().optional(),
    expectedDate: z.string().date().nullable().optional(),
    currencyCode: z.string().trim().length(3).nullable().optional(),
    paymentType: paymentTypeSchema.optional(),
    paymentStatus: paymentStatusSchema.optional(),
    paymentMode: paymentModeSchema.optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    items: z.array(purchaseOrderItemSchema).min(1).max(200).optional(),
  }),
});

export const listPurchaseOrdersSchema = z.object({
  query: z.object({
    search: z.string().trim().min(1).max(120).optional(),
    status: z.enum(['DRAFT', 'ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED']).optional(),
    supplierId: uuidSchema.optional(),
    warehouseId: uuidSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const createPurchaseReceiptSchema = z.object({
  params: z.object({
    purchaseOrderId: uuidSchema,
  }),
  body: z.object({
    receiptDate: z.string().date(),
    notes: z.string().trim().max(2000).nullable().optional(),
    items: z.array(purchaseReceiptItemSchema).min(1).max(200),
  }),
});

export const listPurchaseReceiptsSchema = z.object({
  query: z.object({
    status: z.enum(['DRAFT', 'POSTED', 'CANCELLED']).optional(),
    purchaseOrderId: uuidSchema.optional(),
    supplierId: uuidSchema.optional(),
    warehouseId: uuidSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
