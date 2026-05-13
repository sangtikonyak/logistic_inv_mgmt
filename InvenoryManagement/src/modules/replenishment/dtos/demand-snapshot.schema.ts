import { z } from 'zod';

const uuidSchema = z.uuid();

export const listDemandSnapshotsSchema = z.object({
  query: z.object({
    warehouseId: uuidSchema.optional(),
    productId: uuidSchema.optional(),
    snapshotDate: z.string().date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const demandSnapshotIdParamSchema = z.object({
  params: z.object({
    snapshotId: uuidSchema,
  }),
});

export const refreshDemandSnapshotsSchema = z.object({
  body: z
    .object({
      warehouseId: uuidSchema.optional(),
      productId: uuidSchema.optional(),
      snapshotDate: z.string().date().optional(),
    })
    .default({}),
});
