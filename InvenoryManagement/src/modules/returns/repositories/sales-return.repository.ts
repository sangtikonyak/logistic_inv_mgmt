import mysql from 'mysql2/promise';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import {
  SalesReturn,
  SalesReturnItem,
  SalesReturnItemDetailRow,
  SalesReturnListFilters,
  SalesReturnListRow,
  SalesReturnReferenceItemRow,
  SalesReturnReferenceRow,
} from '../types/returns.types';

export class SalesReturnRepository {
  constructor(private readonly executor: Queryable) {}

  async createSalesReturn(
    salesReturn: Omit<SalesReturn, 'created_at' | 'updated_at'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO sales_returns
      (
        id, tenant_id, customer_id, warehouse_id, sales_order_id, sales_shipment_id,
        sales_return_number, return_date, status, notes, created_by, updated_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      salesReturn.id,
      salesReturn.tenant_id,
      salesReturn.customer_id,
      salesReturn.warehouse_id,
      salesReturn.sales_order_id,
      salesReturn.sales_shipment_id,
      salesReturn.sales_return_number,
      salesReturn.return_date,
      salesReturn.status,
      salesReturn.notes,
      salesReturn.created_by,
      salesReturn.updated_by,
    ]);
  }

  async updateSalesReturn(
    tenantId: string,
    salesReturnId: string,
    payload: { return_date: Date; notes: string | null; updated_by: string },
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE sales_returns
      SET return_date = ?, notes = ?, updated_by = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.return_date,
      payload.notes,
      payload.updated_by,
      tenantId,
      salesReturnId,
    ]);
  }

  async updateSalesReturnStatus(
    tenantId: string,
    salesReturnId: string,
    payload: { status: string; updatedBy: string },
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE sales_returns
      SET status = ?, updated_by = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.status,
      payload.updatedBy,
      tenantId,
      salesReturnId,
    ]);
  }

  async createSalesReturnItem(
    item: SalesReturnItem,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO sales_return_items
      (
        id, tenant_id, sales_return_id, sales_shipment_item_id, product_id,
        product_variant_id, bin_id, returned_quantity, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      item.id,
      item.tenant_id,
      item.sales_return_id,
      item.sales_shipment_item_id,
      item.product_id,
      item.product_variant_id,
      item.bin_id,
      item.returned_quantity,
    ]);
  }

  async deleteSalesReturnItems(
    tenantId: string,
    salesReturnId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `DELETE FROM sales_return_items WHERE tenant_id = ? AND sales_return_id = ?`;
    await executor.execute<mysql.ResultSetHeader>(sql, [tenantId, salesReturnId]);
  }

  async findSalesReturnById(
    tenantId: string,
    salesReturnId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<SalesReturn | null> {
    const sql = `
      SELECT *
      FROM sales_returns
      WHERE tenant_id = ? AND id = ?
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, salesReturnId]);
    return (rows as SalesReturn[])[0] ?? null;
  }

  async findSalesReturnByIdForUpdate(
    tenantId: string,
    salesReturnId: string,
    executor: Queryable | DatabaseTransaction
  ): Promise<SalesReturn | null> {
    const sql = `
      SELECT *
      FROM sales_returns
      WHERE tenant_id = ? AND id = ?
      LIMIT 1
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [tenantId, salesReturnId]);
    return (rows as SalesReturn[])[0] ?? null;
  }

  async findSalesReturnDetailById(
    tenantId: string,
    salesReturnId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<SalesReturnListRow | null> {
    const sql = `
      SELECT
        sr.*,
        c.name AS customer_name,
        w.name AS warehouse_name,
        so.sales_order_number,
        ss.shipment_number
      FROM sales_returns sr
      LEFT JOIN customers c ON c.id = sr.customer_id AND c.tenant_id = sr.tenant_id AND c.deleted_at IS NULL
      INNER JOIN warehouses w ON w.id = sr.warehouse_id AND w.tenant_id = sr.tenant_id AND w.deleted_at IS NULL
      INNER JOIN sales_orders so ON so.id = sr.sales_order_id AND so.tenant_id = sr.tenant_id AND so.deleted_at IS NULL
      INNER JOIN sales_shipments ss ON ss.id = sr.sales_shipment_id AND ss.tenant_id = sr.tenant_id
      WHERE sr.tenant_id = ? AND sr.id = ?
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, salesReturnId]);
    return (rows as SalesReturnListRow[])[0] ?? null;
  }

  async listSalesReturns(tenantId: string, filters: SalesReturnListFilters): Promise<SalesReturnListRow[]> {
    const params: Array<string | number> = [tenantId];
    const where = ['sr.tenant_id = ?'];
    if (filters.search) {
      where.push('(sr.sales_return_number LIKE ? OR COALESCE(c.name, so.customer_name) LIKE ? OR sr.notes LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search, search);
    }
    if (filters.status) {
      where.push('sr.status = ?');
      params.push(filters.status);
    }
    if (filters.customerId) {
      where.push('sr.customer_id = ?');
      params.push(filters.customerId);
    }
    if (filters.warehouseId) {
      where.push('sr.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    if (filters.salesOrderId) {
      where.push('sr.sales_order_id = ?');
      params.push(filters.salesOrderId);
    }
    if (filters.salesShipmentId) {
      where.push('sr.sales_shipment_id = ?');
      params.push(filters.salesShipmentId);
    }
    if (filters.salesReturnNumber) {
      where.push('sr.sales_return_number = ?');
      params.push(filters.salesReturnNumber);
    }
    if (filters.dateFrom) {
      where.push('sr.return_date >= ?');
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.push('sr.return_date <= ?');
      params.push(filters.dateTo);
    }

    const limit = Number(filters.limit);
    const offset = (Number(filters.page) - 1) * limit;
    const sql = `
      SELECT
        sr.*,
        COALESCE(c.name, so.customer_name) AS customer_name,
        w.name AS warehouse_name,
        so.sales_order_number,
        ss.shipment_number
      FROM sales_returns sr
      LEFT JOIN customers c ON c.id = sr.customer_id AND c.tenant_id = sr.tenant_id AND c.deleted_at IS NULL
      INNER JOIN warehouses w ON w.id = sr.warehouse_id AND w.tenant_id = sr.tenant_id AND w.deleted_at IS NULL
      INNER JOIN sales_orders so ON so.id = sr.sales_order_id AND so.tenant_id = sr.tenant_id AND so.deleted_at IS NULL
      INNER JOIN sales_shipments ss ON ss.id = sr.sales_shipment_id AND ss.tenant_id = sr.tenant_id
      WHERE ${where.join(' AND ')}
      ORDER BY sr.${filters.sortBy} ${filters.sortDir}, sr.id ${filters.sortDir}
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, params);
    return rows as SalesReturnListRow[];
  }

  async countSalesReturns(tenantId: string, filters: SalesReturnListFilters): Promise<number> {
    const params: Array<string | number> = [tenantId];
    const where = ['sr.tenant_id = ?'];
    if (filters.search) {
      where.push('(sr.sales_return_number LIKE ? OR COALESCE(c.name, so.customer_name) LIKE ? OR sr.notes LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search, search);
    }
    if (filters.status) {
      where.push('sr.status = ?');
      params.push(filters.status);
    }
    if (filters.customerId) {
      where.push('sr.customer_id = ?');
      params.push(filters.customerId);
    }
    if (filters.warehouseId) {
      where.push('sr.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    if (filters.salesOrderId) {
      where.push('sr.sales_order_id = ?');
      params.push(filters.salesOrderId);
    }
    if (filters.salesShipmentId) {
      where.push('sr.sales_shipment_id = ?');
      params.push(filters.salesShipmentId);
    }
    if (filters.salesReturnNumber) {
      where.push('sr.sales_return_number = ?');
      params.push(filters.salesReturnNumber);
    }
    if (filters.dateFrom) {
      where.push('sr.return_date >= ?');
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.push('sr.return_date <= ?');
      params.push(filters.dateTo);
    }

    const sql = `
      SELECT COUNT(*) AS total
      FROM sales_returns sr
      LEFT JOIN customers c ON c.id = sr.customer_id AND c.tenant_id = sr.tenant_id AND c.deleted_at IS NULL
      INNER JOIN sales_orders so ON so.id = sr.sales_order_id AND so.tenant_id = sr.tenant_id AND so.deleted_at IS NULL
      WHERE ${where.join(' AND ')}
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async listSalesReturnItems(
    tenantId: string,
    salesReturnId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<SalesReturnItemDetailRow[]> {
    const sql = `
      SELECT
        sri.*,
        COALESCE(p.name, pp.name) AS product_name,
        pv.name AS variant_name,
        COALESCE(p.product_type, pp.product_type) AS product_type,
        COALESCE(pv.sku, p.sku, pp.sku) AS sku,
        wb.name AS bin_name,
        ssi.sales_order_item_id,
        ss.shipment_number,
        so.sales_order_number
      FROM sales_return_items sri
      INNER JOIN sales_shipment_items ssi
        ON ssi.id = sri.sales_shipment_item_id
       AND ssi.tenant_id = sri.tenant_id
      INNER JOIN sales_shipments ss
        ON ss.id = ssi.sales_shipment_id
       AND ss.tenant_id = sri.tenant_id
      INNER JOIN sales_orders so
        ON so.id = ss.sales_order_id
       AND so.tenant_id = sri.tenant_id
       AND so.deleted_at IS NULL
      LEFT JOIN products p
        ON p.id = sri.product_id
       AND p.tenant_id = sri.tenant_id
       AND p.deleted_at IS NULL
      LEFT JOIN product_variants pv
        ON pv.id = sri.product_variant_id
       AND pv.tenant_id = sri.tenant_id
       AND pv.deleted_at IS NULL
      LEFT JOIN products pp
        ON pp.id = pv.product_id
       AND pp.tenant_id = sri.tenant_id
       AND pp.deleted_at IS NULL
      LEFT JOIN warehouse_bins wb
        ON wb.id = sri.bin_id
       AND wb.tenant_id = sri.tenant_id
       AND wb.deleted_at IS NULL
      WHERE sri.tenant_id = ? AND sri.sales_return_id = ?
      ORDER BY sri.created_at ASC, sri.id ASC
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, salesReturnId]);
    return rows as SalesReturnItemDetailRow[];
  }

  async getSalesShipmentReference(
    tenantId: string,
    salesShipmentId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<SalesReturnReferenceRow | null> {
    const sql = `
      SELECT
        ss.id AS shipment_id,
        ss.status AS shipment_status,
        ss.shipment_number,
        ss.shipment_date,
        so.id AS sales_order_id,
        so.sales_order_number,
        so.customer_id,
        so.customer_name,
        w.id AS warehouse_id,
        w.name AS warehouse_name
      FROM sales_shipments ss
      INNER JOIN sales_orders so ON so.id = ss.sales_order_id AND so.tenant_id = ss.tenant_id AND so.deleted_at IS NULL
      INNER JOIN warehouses w ON w.id = ss.warehouse_id AND w.tenant_id = ss.tenant_id AND w.deleted_at IS NULL
      WHERE ss.tenant_id = ? AND ss.id = ?
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, salesShipmentId]);
    return (rows as SalesReturnReferenceRow[])[0] ?? null;
  }

  async listSalesShipmentReferenceItems(
    tenantId: string,
    salesShipmentId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<SalesReturnReferenceItemRow[]> {
    const sql = `
      SELECT
        ssi.*,
        COALESCE(p.name, pp.name) AS product_name,
        pv.name AS variant_name,
        COALESCE(p.product_type, pp.product_type) AS product_type,
        COALESCE(p.status, pp.status) AS product_status,
        COALESCE(p.track_inventory, pp.track_inventory) AS track_inventory,
        COALESCE(p.allow_returns, pp.allow_returns) AS allow_returns,
        COALESCE(p.is_sellable, pp.is_sellable) AS is_sellable,
        COALESCE(pv.sku, p.sku, pp.sku) AS sku
      FROM sales_shipment_items ssi
      LEFT JOIN products p ON p.id = ssi.product_id AND p.tenant_id = ssi.tenant_id AND p.deleted_at IS NULL
      LEFT JOIN product_variants pv ON pv.id = ssi.product_variant_id AND pv.tenant_id = ssi.tenant_id AND pv.deleted_at IS NULL
      LEFT JOIN products pp ON pp.id = pv.product_id AND pp.tenant_id = ssi.tenant_id AND pp.deleted_at IS NULL
      WHERE ssi.tenant_id = ? AND ssi.sales_shipment_id = ?
      ORDER BY ssi.created_at ASC, ssi.id ASC
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, salesShipmentId]);
    return rows as SalesReturnReferenceItemRow[];
  }

  async sumReturnedQuantityByShipmentItem(
    tenantId: string,
    salesShipmentItemIds: string[],
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<Map<string, number>> {
    if (salesShipmentItemIds.length === 0) {
      return new Map();
    }

    const placeholders = salesShipmentItemIds.map(() => '?').join(', ');
    const sql = `
      SELECT
        sri.sales_shipment_item_id,
        COALESCE(SUM(sri.returned_quantity), 0) AS total_returned
      FROM sales_return_items sri
      INNER JOIN sales_returns sr
        ON sr.id = sri.sales_return_id
       AND sr.tenant_id = sri.tenant_id
      WHERE sri.tenant_id = ?
        AND sri.sales_shipment_item_id IN (${placeholders})
        AND sr.status = 'POSTED'
      GROUP BY sri.sales_shipment_item_id
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, ...salesShipmentItemIds]);
    return new Map(
      rows.map((row) => [String(row.sales_shipment_item_id), Number(row.total_returned)])
    );
  }
}
