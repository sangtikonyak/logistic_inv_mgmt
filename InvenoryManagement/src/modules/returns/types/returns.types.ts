export type ReturnStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface PurchaseReturn {
  id: string;
  tenant_id: string;
  supplier_id: string;
  warehouse_id: string;
  purchase_order_id: string | null;
  purchase_receipt_id: string;
  purchase_return_number: string;
  return_date: Date;
  status: ReturnStatus;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseReturnItem {
  id: string;
  tenant_id: string;
  purchase_return_id: string;
  purchase_receipt_item_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  bin_id: string | null;
  returned_quantity: string;
  created_at: Date;
  updated_at: Date;
}

export interface SalesReturn {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  warehouse_id: string;
  sales_order_id: string;
  sales_shipment_id: string;
  sales_return_number: string;
  return_date: Date;
  status: ReturnStatus;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SalesReturnItem {
  id: string;
  tenant_id: string;
  sales_return_id: string;
  sales_shipment_item_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  bin_id: string | null;
  returned_quantity: string;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseReturnListFilters {
  page: number;
  limit: number;
  search?: string;
  status?: ReturnStatus;
  supplierId?: string;
  warehouseId?: string;
  purchaseOrderId?: string;
  purchaseReceiptId?: string;
  purchaseReturnNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy: 'return_date' | 'created_at' | 'updated_at' | 'purchase_return_number';
  sortDir: 'ASC' | 'DESC';
}

export interface SalesReturnListFilters {
  page: number;
  limit: number;
  search?: string;
  status?: ReturnStatus;
  customerId?: string;
  warehouseId?: string;
  salesOrderId?: string;
  salesShipmentId?: string;
  salesReturnNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy: 'return_date' | 'created_at' | 'updated_at' | 'sales_return_number';
  sortDir: 'ASC' | 'DESC';
}

export interface PurchaseReturnItemInput {
  purchaseReceiptItemId: string;
  returnedQuantity: number;
  binId?: string | null;
}

export interface SalesReturnItemInput {
  salesShipmentItemId: string;
  returnedQuantity: number;
  binId?: string | null;
}

export interface PurchaseReturnCreateInput {
  purchaseReceiptId: string;
  returnDate: string;
  notes?: string | null;
  items: PurchaseReturnItemInput[];
}

export interface PurchaseReturnUpdateInput {
  returnDate?: string;
  notes?: string | null;
  items?: PurchaseReturnItemInput[];
}

export interface SalesReturnCreateInput {
  salesShipmentId: string;
  returnDate: string;
  notes?: string | null;
  items: SalesReturnItemInput[];
}

export interface SalesReturnUpdateInput {
  returnDate?: string;
  notes?: string | null;
  items?: SalesReturnItemInput[];
}

export interface PurchaseReturnListRow extends PurchaseReturn {
  supplier_name: string;
  warehouse_name: string;
  purchase_order_number: string | null;
  receipt_number: string;
}

export interface SalesReturnListRow extends SalesReturn {
  customer_name: string | null;
  warehouse_name: string;
  sales_order_number: string;
  shipment_number: string;
}

export interface PurchaseReturnItemDetailRow extends PurchaseReturnItem {
  product_name: string | null;
  variant_name: string | null;
  product_type: string | null;
  sku: string | null;
  bin_name: string | null;
  purchase_order_item_id: string;
  receipt_number: string;
  purchase_order_number: string | null;
}

export interface SalesReturnItemDetailRow extends SalesReturnItem {
  product_name: string | null;
  variant_name: string | null;
  product_type: string | null;
  sku: string | null;
  bin_name: string | null;
  sales_order_item_id: string;
  shipment_number: string;
  sales_order_number: string;
}

export interface PurchaseReturnReferenceRow {
  receipt_id: string;
  receipt_status: string;
  receipt_number: string;
  receipt_date: Date;
  purchase_order_id: string;
  purchase_order_number: string;
  supplier_id: string;
  supplier_name: string;
  warehouse_id: string;
  warehouse_name: string;
}

export interface PurchaseReturnReferenceItemRow {
  id: string;
  tenant_id: string;
  purchase_receipt_id: string;
  purchase_order_item_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  bin_id: string | null;
  received_quantity: string;
  unit_cost: string;
  product_name: string | null;
  variant_name: string | null;
  product_type: string | null;
  product_status: string | null;
  track_inventory: number | null;
  allow_returns: number | null;
  is_purchasable: number | null;
  sku: string | null;
}

export interface SalesReturnReferenceRow {
  shipment_id: string;
  shipment_status: string;
  shipment_number: string;
  shipment_date: Date;
  sales_order_id: string;
  sales_order_number: string;
  customer_id: string | null;
  customer_name: string | null;
  warehouse_id: string;
  warehouse_name: string;
}

export interface SalesReturnReferenceItemRow {
  id: string;
  tenant_id: string;
  sales_shipment_id: string;
  sales_order_item_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  bin_id: string | null;
  shipped_quantity: string;
  product_name: string | null;
  variant_name: string | null;
  product_type: string | null;
  product_status: string | null;
  track_inventory: number | null;
  allow_returns: number | null;
  is_sellable: number | null;
  sku: string | null;
}
