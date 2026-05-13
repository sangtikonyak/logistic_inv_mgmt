export type DemandSnapshotListFilters = {
  warehouseId?: string;
  productId?: string;
  snapshotDate?: string;
  page: number;
  limit: number;
};

export type DemandSnapshotRow = {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  product_id: string;
  avg_daily_sales_7d: string;
  avg_daily_sales_30d: string;
  trend_factor: string;
  stockout_days_30d: number;
  last_sale_date: Date | string | null;
  snapshot_date: Date | string;
  created_by: string;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
  warehouse_name: string;
  product_name: string;
  sku: string | null;
};
