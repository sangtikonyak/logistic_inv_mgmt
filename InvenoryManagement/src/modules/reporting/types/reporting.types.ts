export type TrendGroupBy = 'day' | 'week' | 'month';

export interface ReportDateRangeFilters {
  dateFrom?: string;
  dateTo?: string;
}

export interface ReportPagingFilters {
  limit: number;
}

export interface DashboardSummaryFilters extends ReportDateRangeFilters {
  warehouseId?: string;
}

export interface InventorySummaryFilters extends ReportDateRangeFilters {
  warehouseId?: string;
  productId?: string;
}

export interface InventoryMovementSummaryFilters extends InventorySummaryFilters {
  movementType?: string;
  referenceType?: string;
}

export interface PurchaseSummaryFilters extends ReportDateRangeFilters {
  supplierId?: string;
  warehouseId?: string;
  status?: string;
}

export interface SalesSummaryFilters extends ReportDateRangeFilters {
  customerId?: string;
  warehouseId?: string;
  status?: string;
}

export interface ReturnsSummaryFilters extends ReportDateRangeFilters {
  warehouseId?: string;
  supplierId?: string;
  customerId?: string;
}

export interface WarehouseSummaryFilters extends ReportDateRangeFilters {
  warehouseId?: string;
}

export interface RankingFilters extends ReportDateRangeFilters, ReportPagingFilters {
  warehouseId?: string;
  supplierId?: string;
  customerId?: string;
}

export interface LowStockFilters {
  warehouseId?: string;
  productId?: string;
  page: number;
  limit: number;
}

export interface TrendFilters extends ReportDateRangeFilters {
  warehouseId?: string;
  supplierId?: string;
  customerId?: string;
  groupBy: TrendGroupBy;
}

export interface SalesReservationsTrendFilters extends ReportDateRangeFilters {
  warehouseId?: string;
  customerId?: string;
  groupBy: TrendGroupBy;
}
