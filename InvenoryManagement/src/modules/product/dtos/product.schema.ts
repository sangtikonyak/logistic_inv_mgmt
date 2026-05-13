import { z } from 'zod';
import { JsonValue } from '../types/product.types';

const uuidSchema = z.uuid();

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
);

const productAttributeSchema = z.object({
  name: z.string().min(1).max(60),
  value: z.string().min(1).max(100),
});

const moneySchema = z.coerce.number().min(0);

const customFieldValueSchema = z.object({
  definitionId: uuidSchema,
  value: jsonValueSchema,
});

const bundleComponentSchema = z.object({
  id: uuidSchema.optional(),
  componentProductId: uuidSchema,
  componentVariantId: uuidSchema.nullable().optional(),
  quantity: z.coerce.number().positive(),
});

const openingStockSchema = z.object({
  warehouseId: uuidSchema,
  zoneId: uuidSchema.nullable().optional(),
  binId: uuidSchema.nullable().optional(),
  quantity: z.coerce.number().positive(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const variantSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().min(1).max(160),
  sku: z.string().trim().min(1).max(80).nullable().optional(),
  barcode: z.string().trim().min(1).max(80).nullable().optional(),
  costPrice: moneySchema.nullable().optional(),
  sellingPrice: moneySchema.nullable().optional(),
  currencyCode: z.string().length(3).nullable().optional(),
  unitId: uuidSchema.nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  attributes: z.array(productAttributeSchema).min(1).max(20),
  customFieldValues: z.array(customFieldValueSchema).max(100).optional(),
});

const fieldDefinitionValidationRulesSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(0).optional(),
  pattern: z.string().min(1).optional(),
});

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(160),
    description: z.string().max(2000).nullable().optional(),
    productType: z.enum(['SIMPLE', 'VARIABLE', 'SERVICE', 'BUNDLE']).default('SIMPLE'),
    unitId: uuidSchema.nullable().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).default('ACTIVE'),
    sku: z.string().trim().min(1).max(80).nullable().optional(),
    barcode: z.string().trim().min(1).max(80).nullable().optional(),
    isSellable: z.boolean().default(true),
    isPurchasable: z.boolean().default(true),
    trackInventory: z.boolean().default(true),
    allowReturns: z.boolean().default(true),
    allowBackorder: z.boolean().default(false),
    minStockLevel: moneySchema.nullable().optional(),
    maxStockLevel: moneySchema.nullable().optional(),
    costPrice: moneySchema.nullable().optional(),
    sellingPrice: moneySchema.nullable().optional(),
    currencyCode: z.string().length(3).nullable().optional(),
    categoryIds: z.array(uuidSchema).max(25).optional(),
    bundleComponents: z.array(bundleComponentSchema).max(100).optional(),
    customFieldValues: z.array(customFieldValueSchema).max(100).optional(),
    variants: z.array(variantSchema).max(100).optional(),
    openingStock: openingStockSchema.optional(),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    productId: uuidSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(160).optional(),
    description: z.string().max(2000).nullable().optional(),
    productType: z.enum(['SIMPLE', 'VARIABLE', 'SERVICE', 'BUNDLE']).optional(),
    unitId: uuidSchema.nullable().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
    sku: z.string().trim().min(1).max(80).nullable().optional(),
    barcode: z.string().trim().min(1).max(80).nullable().optional(),
    isSellable: z.boolean().optional(),
    isPurchasable: z.boolean().optional(),
    trackInventory: z.boolean().optional(),
    allowReturns: z.boolean().optional(),
    allowBackorder: z.boolean().optional(),
    minStockLevel: moneySchema.nullable().optional(),
    maxStockLevel: moneySchema.nullable().optional(),
    costPrice: moneySchema.nullable().optional(),
    sellingPrice: moneySchema.nullable().optional(),
    currencyCode: z.string().length(3).nullable().optional(),
    categoryIds: z.array(uuidSchema).max(25).optional(),
    bundleComponents: z.array(bundleComponentSchema).max(100).optional(),
    customFieldValues: z.array(customFieldValueSchema).max(100).optional(),
    variants: z.array(variantSchema).max(100).optional(),
  }),
});

export const productIdParamSchema = z.object({
  params: z.object({
    productId: uuidSchema,
  }),
});

export const listProductsSchema = z.object({
  query: z.object({
    search: z.string().trim().min(1).max(120).optional(),
    categoryId: uuidSchema.optional(),
    unitId: uuidSchema.optional(),
    productType: z.enum(['SIMPLE', 'VARIABLE', 'SERVICE', 'BUNDLE']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
    isSellable: z.coerce.boolean().optional(),
    isPurchasable: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
      .number()
      .int()
      .refine((value) => [20, 50, 100].includes(value), 'Limit must be one of 20, 50, or 100')
      .default(20),
    sortBy: z.enum(['created_at', 'updated_at', 'name']).default('created_at'),
    sortDir: z.enum(['ASC', 'DESC']).default('DESC'),
  }),
});

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    parentCategoryId: uuidSchema.nullable().optional(),
    description: z.string().max(1000).nullable().optional(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    categoryId: uuidSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(120).optional(),
    parentCategoryId: uuidSchema.nullable().optional(),
    description: z.string().max(1000).nullable().optional(),
  }),
});

export const categoryIdParamSchema = z.object({
  params: z.object({
    categoryId: uuidSchema,
  }),
});

export const createUnitSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(80),
    code: z.string().min(1).max(30),
    description: z.string().max(1000).nullable().optional(),
  }),
});

export const updateUnitSchema = z.object({
  params: z.object({
    unitId: uuidSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(80).optional(),
    code: z.string().min(1).max(30).optional(),
    description: z.string().max(1000).nullable().optional(),
  }),
});

export const unitIdParamSchema = z.object({
  params: z.object({
    unitId: uuidSchema,
  }),
});

export const createFieldDefinitionSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    fieldKey: z.string().min(1).max(120),
    fieldType: z.enum(['TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'SELECT', 'MULTI_SELECT']),
    appliesTo: z.enum(['PRODUCT', 'VARIANT', 'BOTH']),
    isRequired: z.boolean().default(false),
    allowedValues: z.array(z.string().min(1).max(120)).max(100).optional(),
    validationRules: fieldDefinitionValidationRulesSchema.optional(),
    sortOrder: z.coerce.number().int().min(0).default(0),
  }),
});

export const updateFieldDefinitionSchema = z.object({
  params: z.object({
    definitionId: uuidSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(120).optional(),
    fieldKey: z.string().min(1).max(120).optional(),
    fieldType: z.enum(['TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'SELECT', 'MULTI_SELECT']).optional(),
    appliesTo: z.enum(['PRODUCT', 'VARIANT', 'BOTH']).optional(),
    isRequired: z.boolean().optional(),
    allowedValues: z.array(z.string().min(1).max(120)).max(100).optional(),
    validationRules: fieldDefinitionValidationRulesSchema.optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  }),
});

export const definitionIdParamSchema = z.object({
  params: z.object({
    definitionId: uuidSchema,
  }),
});

export const productAttributeIdParamSchema = z.object({
  params: z.object({
    productId: uuidSchema,
    attributeId: uuidSchema,
  }),
});

export const productAttributeValueIdParamSchema = z.object({
  params: z.object({
    productId: uuidSchema,
    attributeId: uuidSchema,
    valueId: uuidSchema,
  }),
});

export const productIdWithAttributeParamsSchema = z.object({
  params: z.object({
    productId: uuidSchema,
  }),
});

export const createProductAttributeSchema = z.object({
  params: z.object({
    productId: uuidSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(100),
    values: z.array(z.object({
      value: z.string().min(1).max(120),
      sortOrder: z.coerce.number().int().min(0).default(0),
    })).min(1).max(100),
    sortOrder: z.coerce.number().int().min(0).default(0),
  }),
});

export const updateProductAttributeSchema = z.object({
  params: z.object({
    productId: uuidSchema,
    attributeId: uuidSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  }),
});

export const createProductAttributeValueSchema = z.object({
  params: z.object({
    productId: uuidSchema,
    attributeId: uuidSchema,
  }),
  body: z.object({
    value: z.string().min(1).max(120),
    sortOrder: z.coerce.number().int().min(0).default(0),
  }),
});

export const updateProductAttributeValueSchema = z.object({
  params: z.object({
    productId: uuidSchema,
    attributeId: uuidSchema,
    valueId: uuidSchema,
  }),
  body: z.object({
    value: z.string().min(1).max(120).optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  }),
});
