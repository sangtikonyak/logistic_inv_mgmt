import { AppError } from '../../../common/exceptions/app-error';
import { Queryable } from '../../../database/database.types';
import { UnitOfWork } from '../../../database/unit-of-work';
import { ActivityService } from '../../activity/services/activity.service';
import { ReportingRepository } from '../repositories/reporting.repository';
import {
  DashboardSummaryFilters,
  InventoryMovementSummaryFilters,
  InventorySummaryFilters,
  LowStockFilters,
  PurchaseSummaryFilters,
  RankingFilters,
  ReturnsSummaryFilters,
  SalesSummaryFilters,
  SalesReservationsTrendFilters,
  TrendFilters,
  WarehouseSummaryFilters,
} from '../types/reporting.types';

export class ReportingService {
  private readonly reportingRepository: ReportingRepository;

  constructor(
    db: Queryable,
    // kept for module symmetry and future expansion
    private readonly unitOfWork: UnitOfWork,
    private readonly activityService: ActivityService,
  ) {
    this.reportingRepository = new ReportingRepository(db);
  }

  async getDashboardSummary(tenantId: string, filters: DashboardSummaryFilters) {
    this.assertDateRange(filters.dateFrom, filters.dateTo);
    const summary = await this.reportingRepository.getDashboardSummary(tenantId, filters);
    return { summary, filters };
  }

  async getDashboardActivities(tenantId: string) {
    return this.activityService.getLatestActivities(tenantId, 10);
  }

  async getInventoryStockSummary(tenantId: string, filters: InventorySummaryFilters) {
    this.assertDateRange(filters.dateFrom, filters.dateTo);
    return this.reportingRepository.getInventoryStockSummary(tenantId, filters);
  }

  async getInventoryMovementSummary(tenantId: string, filters: InventoryMovementSummaryFilters) {
    this.assertDateRange(filters.dateFrom, filters.dateTo);
    return this.reportingRepository.getInventoryMovementSummary(tenantId, filters);
  }

  async getLowStockReport(tenantId: string, filters: LowStockFilters) {
    const [items, total] = await Promise.all([
      this.reportingRepository.getLowStockReport(tenantId, filters),
      this.reportingRepository.countLowStock(tenantId, filters),
    ]);

    return {
      items,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
      },
      filters,
    };
  }

  async getInventoryValuation(tenantId: string, filters: { warehouseId?: string; productId?: string }) {
    return this.reportingRepository.getInventoryValuation(tenantId, filters);
  }

  async getPurchaseSummary(tenantId: string, filters: PurchaseSummaryFilters) {
    this.assertDateRange(filters.dateFrom, filters.dateTo);
    return this.reportingRepository.getPurchaseSummary(tenantId, filters);
  }

  async getPurchasesBySupplier(tenantId: string, filters: { dateFrom?: string; dateTo?: string; supplierId?: string; limit: number }) {
    this.assertDateRange(filters.dateFrom, filters.dateTo);
    const items = await this.reportingRepository.getPurchasesBySupplier(tenantId, filters);
    return { items, filters };
  }

  async getPurchaseReceiptsTrend(tenantId: string, filters: TrendFilters) {
    this.assertDateRange(filters.dateFrom, filters.dateTo);
    const series = await this.reportingRepository.getPurchaseReceiptsTrend(tenantId, filters);
    return { series, groupBy: filters.groupBy, filters };
  }

  async getSalesSummary(tenantId: string, filters: SalesSummaryFilters) {
    this.assertDateRange(filters.dateFrom, filters.dateTo);
    return this.reportingRepository.getSalesSummary(tenantId, filters);
  }

  async getSalesByCustomer(tenantId: string, filters: { dateFrom?: string; dateTo?: string; customerId?: string; limit: number }) {
    this.assertDateRange(filters.dateFrom, filters.dateTo);
    const items = await this.reportingRepository.getSalesByCustomer(tenantId, filters);
    return { items, filters };
  }

  async getSalesOrdersTrend(tenantId: string, filters: TrendFilters) {
    this.assertDateRange(filters.dateFrom, filters.dateTo);
    const series = await this.reportingRepository.getSalesOrdersTrend(tenantId, filters);
    return { series, groupBy: filters.groupBy, filters };
  }

  async getSalesShipmentsTrend(tenantId: string, filters: TrendFilters) {
    this.assertDateRange(filters.dateFrom, filters.dateTo);
    const series = await this.reportingRepository.getSalesShipmentsTrend(tenantId, filters);
    return { series, groupBy: filters.groupBy, filters };
  }

  async getSalesReservationsTrend(tenantId: string, filters: SalesReservationsTrendFilters) {
    this.assertDateRange(filters.dateFrom, filters.dateTo);
    const series = await this.reportingRepository.getSalesReservationsTrend(tenantId, filters);
    return { series, groupBy: filters.groupBy, filters };
  }

  async getReturnsSummary(tenantId: string, filters: ReturnsSummaryFilters) {
    this.assertDateRange(filters.dateFrom, filters.dateTo);
    return this.reportingRepository.getReturnsSummary(tenantId, filters);
  }

  async getReturnsTrend(tenantId: string, filters: TrendFilters) {
    this.assertDateRange(filters.dateFrom, filters.dateTo);
    const series = await this.reportingRepository.getReturnsTrend(tenantId, filters);
    return { series, groupBy: filters.groupBy, filters };
  }

  async getWarehouseSummary(tenantId: string, filters: WarehouseSummaryFilters) {
    this.assertDateRange(filters.dateFrom, filters.dateTo);
    const items = await this.reportingRepository.getWarehouseSummary(tenantId, filters);
    return { items, filters };
  }

  async getWarehouseUtilization(tenantId: string, filters: WarehouseSummaryFilters) {
    this.assertDateRange(filters.dateFrom, filters.dateTo);
    const items = await this.reportingRepository.getWarehouseUtilization(tenantId, filters);
    return { items, filters };
  }

  async getTopSellingProducts(tenantId: string, filters: RankingFilters) {
    this.assertDateRange(filters.dateFrom, filters.dateTo);
    const items = await this.reportingRepository.getTopSellingProducts(tenantId, filters);
    return { items, filters };
  }

  async getTopPurchasedProducts(tenantId: string, filters: RankingFilters) {
    this.assertDateRange(filters.dateFrom, filters.dateTo);
    const items = await this.reportingRepository.getTopPurchasedProducts(tenantId, filters);
    return { items, filters };
  }

  async getNonMovingProducts(tenantId: string, filters: RankingFilters) {
    this.assertDateRange(filters.dateFrom, filters.dateTo);
    const items = await this.reportingRepository.getNonMovingProducts(tenantId, filters);
    return { items, filters };
  }

  private assertDateRange(dateFrom?: string, dateTo?: string) {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new AppError('dateFrom cannot be after dateTo.', 400);
    }
  }
}
