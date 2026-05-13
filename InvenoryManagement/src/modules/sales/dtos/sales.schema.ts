import { z } from 'zod';
import { PAYMENT_MODE_VALUES, PAYMENT_STATUS_VALUES, PAYMENT_TYPE_VALUES } from '../../../common/constants/payment';

const uuidSchema = z.uuid();
const moneySchema = z.coerce.number().min(0);
const paymentTypeSchema = z.enum(PAYMENT_TYPE_VALUES);
const paymentStatusSchema = z.enum(PAYMENT_STATUS_VALUES);
const paymentModeSchema = z.enum(PAYMENT_MODE_VALUES);

const salesOrderItemSchema = z
  .object({
    productId: uuidSchema.optional(),
    productVariantId: uuidSchema.optional(),
    orderedQuantity: z.coerce.number().positive(),
    unitPrice: moneySchema.default(0),
    taxAmount: moneySchema.default(0),
    discountAmount: moneySchema.default(0),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    const count = Number(Boolean(value.productId)) + Number(Boolean(value.productVariantId));
    if (count !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Each sales item must include either productId or productVariantId',
        path: ['productId'],
      });
    }
  });

const inlineCustomerSchema = z.object({
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
  notes: z.string().trim().max(2000).nullable().optional(),
});

const reservationItemSchema = z.object({
  salesOrderItemId: uuidSchema,
  reservedQuantity: z.coerce.number().positive(),
  binId: uuidSchema.nullable().optional(),
});

const shipmentItemSchema = z.object({
  salesOrderItemId: uuidSchema,
  shippedQuantity: z.coerce.number().positive(),
  binId: uuidSchema.nullable().optional(),
});

export const customerIdParamSchema = z.object({
  params: z.object({
    customerId: uuidSchema,
  }),
});

export const salesOrderIdParamSchema = z.object({
  params: z.object({
    salesOrderId: uuidSchema,
  }),
});

export const reservationIdParamSchema = z.object({
  params: z.object({
    reservationId: uuidSchema,
  }),
});

export const shipmentIdParamSchema = z.object({
  params: z.object({
    shipmentId: uuidSchema,
  }),
});

export const createCustomerSchema = z.object({
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

export const updateCustomerSchema = z.object({
  params: z.object({
    customerId: uuidSchema,
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

export const listCustomersSchema = z.object({
  query: z.object({
    search: z.string().trim().min(1).max(120).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(['created_at', 'updated_at', 'name', 'code']).default('created_at'),
    sortDir: z.enum(['ASC', 'DESC']).default('DESC'),
  }),
});

export const createSalesOrderSchema = z.object({
  body: z.object({
    customerName: z.string().trim().min(1).max(160),
    selectedCustomerId: uuidSchema.optional(),
    saveAsCustomer: z.boolean().default(false),
    customerDetails: inlineCustomerSchema.nullable().optional(),
    warehouseId: uuidSchema,
    orderDate: z.string().date(),
    expectedShipDate: z.string().date().nullable().optional(),
    currencyCode: z.string().trim().length(3).nullable().optional(),
    paymentType: paymentTypeSchema.default('NOT_APPLICABLE'),
    paymentStatus: paymentStatusSchema.default('NOT_APPLICABLE'),
    paymentMode: paymentModeSchema.default('NOT_APPLICABLE'),
    notes: z.string().trim().max(2000).nullable().optional(),
    items: z.array(salesOrderItemSchema).min(1).max(200),
  }),
});

export const updateSalesOrderSchema = z.object({
  params: z.object({
    salesOrderId: uuidSchema,
  }),
  body: z.object({
    customerName: z.string().trim().min(1).max(160).optional(),
    selectedCustomerId: uuidSchema.nullable().optional(),
    saveAsCustomer: z.boolean().optional(),
    customerDetails: inlineCustomerSchema.nullable().optional(),
    warehouseId: uuidSchema.optional(),
    orderDate: z.string().date().optional(),
    expectedShipDate: z.string().date().nullable().optional(),
    currencyCode: z.string().trim().length(3).nullable().optional(),
    paymentType: paymentTypeSchema.optional(),
    paymentStatus: paymentStatusSchema.optional(),
    paymentMode: paymentModeSchema.optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    items: z.array(salesOrderItemSchema).min(1).max(200).optional(),
  }),
});

export const listSalesOrdersSchema = z.object({
  query: z.object({
    search: z.string().trim().min(1).max(120).optional(),
    status: z
      .enum([
        'DRAFT',
        'CONFIRMED',
        'PARTIALLY_RESERVED',
        'RESERVED',
        'PARTIALLY_SHIPPED',
        'SHIPPED',
        'CANCELLED',
      ])
      .optional(),
    customerId: uuidSchema.optional(),
    warehouseId: uuidSchema.optional(),
    sortBy: z
      .enum(['created_at', 'updated_at', 'sales_order_number', 'order_date', 'customer_name', 'status'])
      .default('created_at'),
    sortDir: z.enum(['ASC', 'DESC']).default('DESC'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const createSalesReservationSchema = z.object({
  params: z.object({
    salesOrderId: uuidSchema,
  }),
  body: z.object({
    reservationDate: z.string().date(),
    notes: z.string().trim().max(2000).nullable().optional(),
    items: z.array(reservationItemSchema).min(1).max(200),
  }),
});

export const listSalesReservationsSchema = z.object({
  query: z.object({
    search: z.string().trim().min(1).max(120).optional(),
    status: z.enum(['DRAFT', 'POSTED', 'RELEASED', 'CANCELLED']).optional(),
    salesOrderId: uuidSchema.optional(),
    warehouseId: uuidSchema.optional(),
    sortBy: z
      .enum([
        'created_at',
        'updated_at',
        'reservation_number',
        'reservation_date',
        'sales_order_number',
        'warehouse_name',
        'status',
      ])
      .default('created_at'),
    sortDir: z.enum(['ASC', 'DESC']).default('DESC'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const createSalesShipmentSchema = z.object({
  params: z.object({
    salesOrderId: uuidSchema,
  }),
  body: z.object({
    shipmentDate: z.string().date(),
    notes: z.string().trim().max(2000).nullable().optional(),
    items: z.array(shipmentItemSchema).min(1).max(200),
  }),
});

export const listSalesShipmentsSchema = z.object({
  query: z.object({
    search: z.string().trim().min(1).max(120).optional(),
    status: z.enum(['DRAFT', 'POSTED', 'CANCELLED']).optional(),
    salesOrderId: uuidSchema.optional(),
    warehouseId: uuidSchema.optional(),
    sortBy: z
      .enum([
        'created_at',
        'updated_at',
        'shipment_number',
        'shipment_date',
        'sales_order_number',
        'warehouse_name',
        'status',
      ])
      .default('created_at'),
    sortDir: z.enum(['ASC', 'DESC']).default('DESC'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
