import { z } from 'zod';

const uuidSchema = z.uuid();

const requisitionItemSchema = z
  .object({
    productId: uuidSchema.optional(),
    productVariantId: uuidSchema.optional(),
    requestedQuantity: z.coerce.number().positive(),
    estimatedUnitCost: z.coerce.number().min(0).default(0),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    const count = Number(Boolean(value.productId)) + Number(Boolean(value.productVariantId));
    if (count !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Each requisition item must include either productId or productVariantId',
        path: ['productId'],
      });
    }
  });

export const requisitionIdParamSchema = z.object({
  params: z.object({
    requisitionId: uuidSchema,
  }),
});

export const createRequisitionSchema = z.object({
  body: z.object({
    warehouseId: uuidSchema,
    requiredByDate: z.string().date().nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    items: z.array(requisitionItemSchema).min(1).max(200),
  }),
});

export const listRequisitionsSchema = z.object({
  query: z.object({
    status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
    warehouseId: uuidSchema.optional(),
    search: z.string().trim().min(1).max(120).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
