import type { PaymentMode, PaymentStatus, PaymentType } from '../../../common/constants/payment';

export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type SalesOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PARTIALLY_RESERVED'
  | 'RESERVED'
  | 'PARTIALLY_SHIPPED'
  | 'SHIPPED'
  | 'CANCELLED';
export type SalesReservationStatus = 'DRAFT' | 'POSTED' | 'RELEASED' | 'CANCELLED';
export type SalesShipmentStatus = 'DRAFT' | 'ALLOCATED' | 'PICKING' | 'PICKED' | 'PACKED' | 'READY' | 'DISPATCHED' | 'POSTED' | 'CANCELLED';

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  tax_number: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  status: CustomerStatus;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface SalesOrder {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  customer_name: string;
  warehouse_id: string;
  sales_order_number: string;
  status: SalesOrderStatus;
  order_date: Date;
  expected_ship_date: Date | null;
  currency_code: string | null;
  payment_type: PaymentType;
  payment_status: PaymentStatus;
  payment_mode: PaymentMode;
  subtotal_amount: string;
  tax_amount: string;
  discount_amount: string;
  total_amount: string;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface SalesOrderItem {
  id: string;
  tenant_id: string;
  sales_order_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  ordered_quantity: string;
  reserved_quantity: string;
  shipped_quantity: string;
  unit_price: string;
  tax_amount: string;
  discount_amount: string;
  line_total: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SalesReservation {
  id: string;
  tenant_id: string;
  sales_order_id: string;
  warehouse_id: string;
  reservation_number: string;
  reservation_date: Date;
  status: SalesReservationStatus;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SalesReservationItem {
  id: string;
  tenant_id: string;
  sales_reservation_id: string;
  sales_order_item_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  bin_id: string | null;
  reserved_quantity: string;
  created_at: Date;
  updated_at: Date;
}

export interface SalesShipment {
  id: string;
  tenant_id: string;
  sales_order_id: string;
  warehouse_id: string;
  shipment_number: string;
  shipment_date: Date;
  status: SalesShipmentStatus;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SalesShipmentItem {
  id: string;
  tenant_id: string;
  sales_shipment_id: string;
  sales_order_item_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  bin_id: string | null;
  shipped_quantity: string;
  created_at: Date;
  updated_at: Date;
}

export interface SalesItemReference {
  productId: string | null;
  productVariantId: string | null;
  productType: string;
  productStatus: string;
  isSellable: boolean;
  trackInventory: boolean;
  productName: string;
  variantName: string | null;
  sku: string | null;
}

export interface CustomerListFilters {
  search?: string;
  status?: CustomerStatus;
  page: number;
  limit: number;
  sortBy: 'created_at' | 'updated_at' | 'name' | 'code';
  sortDir: 'ASC' | 'DESC';
}

export interface SalesOrderListFilters {
  search?: string;
  status?: SalesOrderStatus;
  customerId?: string;
  warehouseId?: string;
  sortBy: 'created_at' | 'updated_at' | 'sales_order_number' | 'order_date' | 'customer_name' | 'status';
  sortDir: 'ASC' | 'DESC';
  page: number;
  limit: number;
}

export interface SalesReservationListFilters {
  search?: string;
  status?: SalesReservationStatus;
  salesOrderId?: string;
  warehouseId?: string;
  sortBy:
    | 'created_at'
    | 'updated_at'
    | 'reservation_number'
    | 'reservation_date'
    | 'sales_order_number'
    | 'warehouse_name'
    | 'status';
  sortDir: 'ASC' | 'DESC';
  page: number;
  limit: number;
}

export interface SalesShipmentListFilters {
  search?: string;
  status?: SalesShipmentStatus;
  salesOrderId?: string;
  warehouseId?: string;
  sortBy:
    | 'created_at'
    | 'updated_at'
    | 'shipment_number'
    | 'shipment_date'
    | 'sales_order_number'
    | 'warehouse_name'
    | 'status';
  sortDir: 'ASC' | 'DESC';
  page: number;
  limit: number;
}

export interface CustomerUpsertInput {
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  taxNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  status: CustomerStatus;
  notes?: string | null;
}

export interface InlineCustomerInput {
  email?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  taxNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  notes?: string | null;
}

export interface SalesOrderItemInput {
  productId?: string;
  productVariantId?: string;
  orderedQuantity: number;
  unitPrice?: number;
  taxAmount?: number;
  discountAmount?: number;
  notes?: string | null;
}

export interface SalesOrderCreateInput {
  customerName: string;
  selectedCustomerId?: string;
  saveAsCustomer?: boolean;
  customerDetails?: InlineCustomerInput | null;
  warehouseId: string;
  orderDate: string;
  expectedShipDate?: string | null;
  currencyCode?: string | null;
  paymentType: PaymentType;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode;
  notes?: string | null;
  items: SalesOrderItemInput[];
}

export interface SalesOrderUpdateInput {
  customerName?: string;
  selectedCustomerId?: string | null;
  saveAsCustomer?: boolean;
  customerDetails?: InlineCustomerInput | null;
  warehouseId?: string;
  orderDate?: string;
  expectedShipDate?: string | null;
  currencyCode?: string | null;
  paymentType?: PaymentType;
  paymentStatus?: PaymentStatus;
  paymentMode?: PaymentMode;
  notes?: string | null;
  items?: SalesOrderItemInput[];
}

export interface SalesReservationItemInput {
  salesOrderItemId: string;
  reservedQuantity: number;
  binId?: string | null;
}

export interface SalesReservationCreateInput {
  reservationDate: string;
  notes?: string | null;
  items: SalesReservationItemInput[];
}

export interface SalesShipmentItemInput {
  salesOrderItemId: string;
  shippedQuantity: number;
  binId?: string | null;
}

export interface SalesShipmentCreateInput {
  shipmentDate: string;
  notes?: string | null;
  items: SalesShipmentItemInput[];
}

export interface SalesOrderListRow extends SalesOrder {
  warehouse_name: string;
}

export interface SalesOrderItemDetailRow extends SalesOrderItem {
  product_name: string | null;
  variant_name: string | null;
  product_type: string | null;
  sku: string | null;
}

export interface SalesReservationListRow extends SalesReservation {
  sales_order_number: string;
  warehouse_name: string;
}

export interface SalesReservationItemDetailRow extends SalesReservationItem {
  product_name: string | null;
  variant_name: string | null;
  product_type: string | null;
  sku: string | null;
  bin_name: string | null;
}

export interface SalesShipmentListRow extends SalesShipment {
  sales_order_number: string;
  warehouse_name: string;
}

export interface SalesShipmentItemDetailRow extends SalesShipmentItem {
  product_name: string | null;
  variant_name: string | null;
  product_type: string | null;
  sku: string | null;
  bin_name: string | null;
}
