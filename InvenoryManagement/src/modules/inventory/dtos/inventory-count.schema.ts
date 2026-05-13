import { z } from 'zod';

const uuidSchema = z.uuid();

export const createCountPlanSchema = z.object({
  body: z.object({
    warehouseId: uuidSchema,
    name: z.string().min(3).max(160),
    countType: z.enum(['FULL', 'CYCLE', 'SPOT']),
    binIds: z.array(uuidSchema).optional(), // If provided, only create tasks for these bins
  }),
});

export const taskIdParamSchema = z.object({
  params: z.object({
    taskId: uuidSchema,
  }),
});

export const confirmCountItemSchema = z.object({
  params: z.object({
    taskId: uuidSchema,
    itemId: uuidSchema,
  }),
  body: z.object({
    countedQuantity: z.coerce.number().min(0),
  }),
});

export const listCountPlansSchema = z.object({
  query: z.object({
    warehouseId: uuidSchema.optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
