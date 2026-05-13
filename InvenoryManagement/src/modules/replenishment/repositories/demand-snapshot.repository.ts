import mysql from 'mysql2/promise';
import { Queryable } from '../../../database/database.types';
import { DemandSnapshotListFilters, DemandSnapshotRow } from '../types/replenishment.types';

export class DemandSnapshotRepository {
  constructor(private readonly executor: Queryable) {}

  async listSnapshots(tenantId: string, filters: DemandSnapshotListFilters): Promise<DemandSnapshotRow[]> {
    const params: Array<string | number> = [tenantId];
    const where = ['ds.tenant_id = ?'];

    if (filters.warehouseId) {
      where.push('ds.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    if (filters.productId) {
      where.push('ds.product_id = ?');
      params.push(filters.productId);
    }
    if (filters.snapshotDate) {
      where.push('ds.snapshot_date = ?');
      params.push(filters.snapshotDate);
    }

    const limit = Number(filters.limit);
    const offset = (Number(filters.page) - 1) * limit;
    const sql = `
      SELECT
        ds.*,
        w.name AS warehouse_name,
        p.name AS product_name,
        p.sku AS sku
      FROM demand_snapshots ds
      INNER JOIN warehouses w ON w.id = ds.warehouse_id AND w.tenant_id = ds.tenant_id AND w.deleted_at IS NULL
      INNER JOIN products p ON p.id = ds.product_id AND p.tenant_id = ds.tenant_id AND p.deleted_at IS NULL
      WHERE ${where.join(' AND ')}
      ORDER BY ds.snapshot_date DESC, ds.updated_at DESC, ds.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, params);
    return rows as DemandSnapshotRow[];
  }

  async countSnapshots(tenantId: string, filters: DemandSnapshotListFilters): Promise<number> {
    const params: Array<string | number> = [tenantId];
    const where = ['tenant_id = ?'];

    if (filters.warehouseId) {
      where.push('warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    if (filters.productId) {
      where.push('product_id = ?');
      params.push(filters.productId);
    }
    if (filters.snapshotDate) {
      where.push('snapshot_date = ?');
      params.push(filters.snapshotDate);
    }

    const sql = `SELECT COUNT(*) AS total FROM demand_snapshots WHERE ${where.join(' AND ')}`;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async findSnapshotById(tenantId: string, snapshotId: string): Promise<DemandSnapshotRow | null> {
    const sql = `
      SELECT
        ds.*,
        w.name AS warehouse_name,
        p.name AS product_name,
        p.sku AS sku
      FROM demand_snapshots ds
      INNER JOIN warehouses w ON w.id = ds.warehouse_id AND w.tenant_id = ds.tenant_id AND w.deleted_at IS NULL
      INNER JOIN products p ON p.id = ds.product_id AND p.tenant_id = ds.tenant_id AND p.deleted_at IS NULL
      WHERE ds.tenant_id = ? AND ds.id = ?
      LIMIT 1
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, snapshotId]);
    return ((rows as DemandSnapshotRow[])[0] ?? null) as DemandSnapshotRow | null;
  }

  async refreshSnapshots(
    tenantId: string,
    actorUserId: string,
    input: { warehouseId?: string; productId?: string; snapshotDate: string },
  ) {
    const params: Array<string | number> = [tenantId];
    let filterSql = '';
    if (input.warehouseId) {
      filterSql += ' AND st.warehouse_id = ?';
      params.push(input.warehouseId);
    }
    if (input.productId) {
      filterSql += ' AND st.product_id = ?';
      params.push(input.productId);
    }

    const sql = `
      INSERT INTO demand_snapshots
      (
        id, tenant_id, warehouse_id, product_id, avg_daily_sales_7d, avg_daily_sales_30d, trend_factor,
        stockout_days_30d, last_sale_date, snapshot_date, created_by, updated_by, created_at, updated_at
      )
      SELECT
        UUID(),
        st.tenant_id,
        st.warehouse_id,
        st.product_id,
        ROUND(COALESCE((
          SELECT SUM(ssi.shipped_quantity)
          FROM sales_shipment_items ssi
          INNER JOIN sales_shipments ss ON ss.id = ssi.sales_shipment_id AND ss.tenant_id = ssi.tenant_id
          WHERE ssi.tenant_id = st.tenant_id
            AND ss.warehouse_id = st.warehouse_id
            AND ssi.product_id = st.product_id
            AND ss.shipment_date >= DATE_SUB(?, INTERVAL 7 DAY)
            AND ss.shipment_date < DATE_ADD(?, INTERVAL 1 DAY)
        ), 0) / 7, 4),
        ROUND(COALESCE((
          SELECT SUM(ssi.shipped_quantity)
          FROM sales_shipment_items ssi
          INNER JOIN sales_shipments ss ON ss.id = ssi.sales_shipment_id AND ss.tenant_id = ssi.tenant_id
          WHERE ssi.tenant_id = st.tenant_id
            AND ss.warehouse_id = st.warehouse_id
            AND ssi.product_id = st.product_id
            AND ss.shipment_date >= DATE_SUB(?, INTERVAL 30 DAY)
            AND ss.shipment_date < DATE_ADD(?, INTERVAL 1 DAY)
        ), 0) / 30, 4),
        0,
        CASE WHEN SUM(st.available_quantity) <= 0 THEN 30 ELSE 0 END,
        (
          SELECT MAX(ss.shipment_date)
          FROM sales_shipment_items ssi
          INNER JOIN sales_shipments ss ON ss.id = ssi.sales_shipment_id AND ss.tenant_id = ssi.tenant_id
          WHERE ssi.tenant_id = st.tenant_id
            AND ss.warehouse_id = st.warehouse_id
            AND ssi.product_id = st.product_id
        ),
        ?,
        ?,
        ?,
        NOW(),
        NOW()
      FROM inventory_stocks st
      INNER JOIN products p ON p.id = st.product_id AND p.tenant_id = st.tenant_id AND p.deleted_at IS NULL
      INNER JOIN warehouses w ON w.id = st.warehouse_id AND w.tenant_id = st.tenant_id AND w.deleted_at IS NULL
      WHERE st.tenant_id = ?
        AND st.product_id IS NOT NULL
      ${filterSql}
      GROUP BY st.tenant_id, st.warehouse_id, st.product_id
      ON DUPLICATE KEY UPDATE
        avg_daily_sales_7d = VALUES(avg_daily_sales_7d),
        avg_daily_sales_30d = VALUES(avg_daily_sales_30d),
        trend_factor = CASE
          WHEN VALUES(avg_daily_sales_30d) = 0 THEN 0
          ELSE ROUND(VALUES(avg_daily_sales_7d) / VALUES(avg_daily_sales_30d), 4)
        END,
        stockout_days_30d = VALUES(stockout_days_30d),
        last_sale_date = VALUES(last_sale_date),
        updated_by = VALUES(updated_by),
        updated_at = NOW()
    `;

    const queryParams: Array<string | number> = [
      input.snapshotDate,
      input.snapshotDate,
      input.snapshotDate,
      input.snapshotDate,
      input.snapshotDate,
      actorUserId,
      actorUserId,
      ...params,
    ];
    const [result] = await this.executor.execute<mysql.ResultSetHeader>(sql, queryParams);
    return result.affectedRows;
  }
}
