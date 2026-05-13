export type TransferStatus = 'DRAFT' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
export type MovementType =
  | 'OPENING'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'RECEIPT'
  | 'ISSUE'
  | 'RESERVATION'
  | 'RESERVATION_RELEASE';

export interface InventoryStockRow {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  zone_id: string | null;
  bin_id: string | null;
  product_id: string | null;
  product_variant_id: string | null;
  on_hand_quantity: string;
  reserved_quantity: string;
  available_quantity: string;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryStockListRow extends InventoryStockRow {
  warehouse_name: string;
  zone_name: string | null;
  bin_name: string | null;
  product_name: string | null;
  variant_name: string | null;
  product_type: string | null;
  sku: string | null;
}

export interface InventoryMovement {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  zone_id: string | null;
  bin_id: string | null;
  product_id: string | null;
  product_variant_id: string | null;
  lot_id?: string | null;
  container_id?: string | null;
  cost_layer_id?: string | null;
  movement_type: MovementType;
  reference_type: string | null;
  reference_id: string | null;
  quantity: string;
  notes: string | null;
  created_by: string | null;
  created_at?: Date;
}

export interface InventoryMovementListRow extends InventoryMovement {
  warehouse_name: string;
  zone_name: string | null;
  bin_name: string | null;
  product_name: string | null;
  variant_name: string | null;
  product_type: string | null;
  sku: string | null;
}

export interface WarehouseTransfer {
  id: string;
  tenant_id: string;
  transfer_number: string;
  source_warehouse_id: string;
  destination_warehouse_id: string;
  status: TransferStatus;
  notes: string | null;
  requested_at: Date;
  completed_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface WarehouseTransferItem {
  id: string;
  tenant_id: string;
  transfer_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  quantity: string;
  source_bin_id: string | null;
  destination_bin_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface WarehouseTransferDetailRow extends WarehouseTransfer {
  source_warehouse_name: string;
  destination_warehouse_name: string;
}

export interface WarehouseTransferItemDetailRow extends WarehouseTransferItem {
  product_name: string | null;
  variant_name: string | null;
  product_type: string | null;
  sku: string | null;
}

export interface StockListFilters {
  search?: string;
  zoneId?: string;
  binId?: string;
  productId?: string;
  productVariantId?: string;
  page: number;
  limit: number;
}

export interface InventoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface TransferListFilters {
  status?: TransferStatus;
  sourceWarehouseId?: string;
  destinationWarehouseId?: string;
  page: number;
  limit: number;
}

export interface MovementListFilters {
  movementType?: MovementType;
  productId?: string;
  productVariantId?: string;
  page: number;
  limit: number;
}

export interface TransferItemInput {
  productId?: string;
  productVariantId?: string;
  quantity: number;
  sourceBinId?: string | null;
  destinationBinId?: string | null;
}

export interface TransferCreateInput {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  notes?: string | null;
  items: TransferItemInput[];
}

export interface StockAdjustmentInput {
  productId?: string;
  productVariantId?: string;
  zoneId?: string | null;
  binId?: string | null;
  adjustmentType: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
  quantity: number;
  unitCost?: number;
  receiptDate?: string;
  notes?: string | null;
}

export interface StockLocationUpdateInput {
  zoneId?: string | null;
  binId?: string | null;
}

export interface InventoryItemReference {
  productId: string | null;
  productVariantId: string | null;
  productType: string;
  trackInventory: boolean;
  productName: string;
  variantName: string | null;
  sku: string | null;
}

export interface InventoryCostLayer {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  lot_id: string | null;
  container_id: string | null;
  reference_type: string;
  reference_id: string;
  receipt_date: Date;
  qty_received: string;
  qty_remaining: string;
  unit_cost: string;
  landed_cost: string;
  currency_code: string | null;
  created_by: string | null;
  created_at: Date;
}

export interface InventoryLayerConsumption {
  id: string;
  tenant_id: string;
  inventory_cost_layer_id: string;
  reference_type: string;
  reference_id: string;
  consumed_quantity: string;
  unit_cost: string;
  created_by: string | null;
  created_at: Date;
}
