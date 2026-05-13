import { AppError } from '../../../common/exceptions/app-error';
import { Queryable } from '../../../database/database.types';
import { UnitOfWork } from '../../../database/unit-of-work';
import { ActivityService } from '../../activity/services/activity.service';
import { DemandSnapshotRepository } from '../repositories/demand-snapshot.repository';
import { DemandSnapshotListFilters } from '../types/replenishment.types';

export class DemandSnapshotService {
  private readonly demandSnapshotRepository: DemandSnapshotRepository;

  constructor(
    db: Queryable,
    private readonly unitOfWork: UnitOfWork,
    private readonly activityService: ActivityService,
  ) {
    this.demandSnapshotRepository = new DemandSnapshotRepository(db);
  }

  async listSnapshots(tenantId: string, filters: DemandSnapshotListFilters) {
    const [items, total] = await Promise.all([
      this.demandSnapshotRepository.listSnapshots(tenantId, filters),
      this.demandSnapshotRepository.countSnapshots(tenantId, filters),
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
      },
      filters,
    };
  }

  async getSnapshotById(tenantId: string, snapshotId: string) {
    const snapshot = await this.demandSnapshotRepository.findSnapshotById(tenantId, snapshotId);
    if (!snapshot) {
      throw new AppError('Demand snapshot not found.', 404);
    }
    return this.toResponse(snapshot);
  }

  async refreshSnapshots(
    tenantId: string,
    actorUserId: string,
    input: { warehouseId?: string; productId?: string; snapshotDate?: string },
  ) {
    const snapshotDate = input.snapshotDate ?? new Date().toISOString().slice(0, 10);
    const affectedRows = await this.unitOfWork.execute(async () => {
      return this.demandSnapshotRepository.refreshSnapshots(tenantId, actorUserId, {
        warehouseId: input.warehouseId,
        productId: input.productId,
        snapshotDate,
      });
    });

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'REPLENISHMENT',
      description: `Demand snapshots refreshed for ${snapshotDate}`,
      metadata: {
        snapshotDate,
        warehouseId: input.warehouseId ?? null,
        productId: input.productId ?? null,
        affectedRows,
      },
    });

    return { snapshotDate, affectedRows };
  }

  private toResponse(item: any) {
    return {
      id: item.id,
      warehouseId: item.warehouse_id,
      warehouseName: item.warehouse_name,
      productId: item.product_id,
      productName: item.product_name,
      sku: item.sku,
      avgDailySales7d: Number(item.avg_daily_sales_7d),
      avgDailySales30d: Number(item.avg_daily_sales_30d),
      trendFactor: Number(item.trend_factor),
      stockoutDays30d: Number(item.stockout_days_30d),
      lastSaleDate: item.last_sale_date,
      snapshotDate: item.snapshot_date,
      updatedAt: item.updated_at,
    };
  }
}
