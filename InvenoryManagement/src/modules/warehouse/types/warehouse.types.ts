export type WarehouseStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
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

export interface Warehouse {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  status: WarehouseStatus;
  is_default: number;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: string | null;
  longitude: string | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface WarehouseZone {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  name: string;
  code: string;
  sort_order: number;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface WarehouseBin {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  zone_id: string;
  name: string;
  code: string;
  sort_order: number;
  is_pickable: number;
  is_receiving: number;
  is_dispatch: number;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

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
  movement_type: MovementType;
  reference_type: string | null;
  reference_id: string | null;
  quantity: string;
  notes: string | null;
  created_by: string | null;
  created_at?: Date;
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

export interface WarehouseListFilters {
  search?: string;
  status?: WarehouseStatus;
  isDefault?: boolean;
  page: number;
  limit: number;
  sortBy: 'created_at' | 'updated_at' | 'name' | 'code';
  sortDir: 'ASC' | 'DESC';
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

export interface WarehouseCreateInput {
  name: string;
  code: string;
  status: WarehouseStatus;
  isDefault?: boolean;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface WarehouseUpdateInput extends Partial<WarehouseCreateInput> {}

export interface ZoneCreateInput {
  name: string;
  code: string;
  sortOrder?: number;
}

export interface ZoneUpdateInput extends Partial<ZoneCreateInput> {}

export interface BinCreateInput {
  name: string;
  code: string;
  sortOrder?: number;
  isPickable?: boolean;
  isReceiving?: boolean;
  isDispatch?: boolean;
}

export interface BinUpdateInput extends Partial<BinCreateInput> {}

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
  notes?: string | null;
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

export interface InventoryMovementListRow extends InventoryMovement {
  warehouse_name: string;
  zone_name: string | null;
  bin_name: string | null;
  product_name: string | null;
  variant_name: string | null;
  product_type: string | null;
  sku: string | null;
}
