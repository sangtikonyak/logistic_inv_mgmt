import type { PaymentMode, PaymentStatus, PaymentType } from '../../../common/constants/payment';

export type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type PurchaseOrderStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
export type PurchaseReceiptStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export type SupplierTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
export type VendorType = 'MANUFACTURER' | 'DISTRIBUTOR' | 'WHOLESALER' | 'RETAILER' | 'SERVICE_PROVIDER';

export interface Supplier {
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
  tier: SupplierTier;
  rating: string;
  vendor_type: VendorType;
  status: SupplierStatus;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  supplier_id: string;
  warehouse_id: string;
  purchase_order_number: string;
  status: PurchaseOrderStatus;
  order_date: Date;
  expected_date: Date | null;
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

export interface PurchaseOrderItem {
  id: string;
  tenant_id: string;
  purchase_order_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  ordered_quantity: string;
  received_quantity: string;
  unit_cost: string;
  tax_amount: string;
  discount_amount: string;
  line_total: string;
  procurement_requisition_item_id: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseReceipt {
  id: string;
  tenant_id: string;
  purchase_order_id: string;
  supplier_id: string;
  warehouse_id: string;
  receipt_number: string;
  receipt_date: Date;
  status: PurchaseReceiptStatus;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseReceiptItem {
  id: string;
  tenant_id: string;
  purchase_receipt_id: string;
  purchase_order_item_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  bin_id: string | null;
  lot_id: string | null;
  container_id: string | null;
  lot_number: string | null;
  container_code: string | null;
  expiry_date: Date | null;
  received_quantity: string;
  accepted_quantity: string;
  rejected_quantity: string;
  unit_cost: string;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseItemReference {
  productId: string | null;
  productVariantId: string | null;
  productType: string;
  productStatus: string;
  isPurchasable: boolean;
  trackInventory: boolean;
  productName: string;
  variantName: string | null;
  sku: string | null;
}

export interface SupplierListFilters {
  search?: string;
  status?: SupplierStatus;
  page: number;
  limit: number;
  sortBy: 'created_at' | 'updated_at' | 'name' | 'code';
  sortDir: 'ASC' | 'DESC';
}

export interface PurchaseOrderListFilters {
  search?: string;
  status?: PurchaseOrderStatus;
  supplierId?: string;
  warehouseId?: string;
  page: number;
  limit: number;
}

export interface PurchaseReceiptListFilters {
  status?: PurchaseReceiptStatus;
  purchaseOrderId?: string;
  supplierId?: string;
  warehouseId?: string;
  page: number;
  limit: number;
}

export interface SupplierUpsertInput {
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
  tier?: SupplierTier;
  rating?: number;
  vendorType?: VendorType;
  status: SupplierStatus;
  notes?: string | null;
}

export interface PurchaseOrderItemInput {
  productId?: string;
  productVariantId?: string;
  orderedQuantity: number;
  unitCost?: number;
  taxAmount?: number;
  discountAmount?: number;
  procurementRequisitionItemId?: string | null;
  notes?: string | null;
}

export interface PurchaseOrderCreateInput {
  supplierId: string;
  warehouseId: string;
  orderDate: string;
  expectedDate?: string | null;
  currencyCode?: string | null;
  paymentType: PaymentType;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode;
  notes?: string | null;
  items: PurchaseOrderItemInput[];
}

export interface PurchaseOrderUpdateInput {
  supplierId?: string;
  warehouseId?: string;
  orderDate?: string;
  expectedDate?: string | null;
  currencyCode?: string | null;
  paymentType?: PaymentType;
  paymentStatus?: PaymentStatus;
  paymentMode?: PaymentMode;
  notes?: string | null;
  items?: PurchaseOrderItemInput[];
}

export interface PurchaseReceiptItemInput {
  purchaseOrderItemId: string;
  receivedQuantity: number;
  acceptedQuantity?: number;
  rejectedQuantity?: number;
  binId?: string | null;
  lotNumber?: string | null;
  expiryDate?: string | null;
  containerCode?: string | null;
  unitCost?: number;
}

export interface PurchaseReceiptCreateInput {
  receiptDate: string;
  notes?: string | null;
  items: PurchaseReceiptItemInput[];
}

export interface PurchaseOrderListRow extends PurchaseOrder {
  supplier_name: string;
  warehouse_name: string;
}

export interface PurchaseOrderItemDetailRow extends PurchaseOrderItem {
  product_name: string | null;
  variant_name: string | null;
  product_type: string | null;
  sku: string | null;
}

export interface PurchaseReceiptListRow extends PurchaseReceipt {
  purchase_order_number: string;
  supplier_name: string;
  warehouse_name: string;
}

export interface PurchaseReceiptItemDetailRow extends PurchaseReceiptItem {
  product_name: string | null;
  variant_name: string | null;
  product_type: string | null;
  sku: string | null;
  bin_name: string | null;
  lot_number: string | null;
  container_code: string | null;
}
