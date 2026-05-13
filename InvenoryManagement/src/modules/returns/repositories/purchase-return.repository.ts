import mysql from 'mysql2/promise';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import {
  PurchaseReturn,
  PurchaseReturnItem,
  PurchaseReturnItemDetailRow,
  PurchaseReturnListFilters,
  PurchaseReturnListRow,
  PurchaseReturnReferenceItemRow,
  PurchaseReturnReferenceRow,
} from '../types/returns.types';

export class PurchaseReturnRepository {
  constructor(private readonly executor: Queryable) {}

  async createPurchaseReturn(
    purchaseReturn: Omit<PurchaseReturn, 'created_at' | 'updated_at'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO purchase_returns
      (
        id, tenant_id, supplier_id, warehouse_id, purchase_order_id, purchase_receipt_id,
        purchase_return_number, return_date, status, notes, created_by, updated_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      purchaseReturn.id,
      purchaseReturn.tenant_id,
      purchaseReturn.supplier_id,
      purchaseReturn.warehouse_id,
      purchaseReturn.purchase_order_id,
      purchaseReturn.purchase_receipt_id,
      purchaseReturn.purchase_return_number,
      purchaseReturn.return_date,
      purchaseReturn.status,
      purchaseReturn.notes,
      purchaseReturn.created_by,
      purchaseReturn.updated_by,
    ]);
  }

  async updatePurchaseReturn(
    tenantId: string,
    purchaseReturnId: string,
    payload: { return_date: Date; notes: string | null; updated_by: string },
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE purchase_returns
      SET return_date = ?, notes = ?, updated_by = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.return_date,
      payload.notes,
      payload.updated_by,
      tenantId,
      purchaseReturnId,
    ]);
  }

  async updatePurchaseReturnStatus(
    tenantId: string,
    purchaseReturnId: string,
    payload: { status: string; updatedBy: string },
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE purchase_returns
      SET status = ?, updated_by = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.status,
      payload.updatedBy,
      tenantId,
      purchaseReturnId,
    ]);
  }

  async createPurchaseReturnItem(
    item: PurchaseReturnItem,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO purchase_return_items
      (
        id, tenant_id, purchase_return_id, purchase_receipt_item_id, product_id,
        product_variant_id, bin_id, returned_quantity, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      item.id,
      item.tenant_id,
      item.purchase_return_id,
      item.purchase_receipt_item_id,
      item.product_id,
      item.product_variant_id,
      item.bin_id,
      item.returned_quantity,
    ]);
  }

  async deletePurchaseReturnItems(
    tenantId: string,
    purchaseReturnId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `DELETE FROM purchase_return_items WHERE tenant_id = ? AND purchase_return_id = ?`;
    await executor.execute<mysql.ResultSetHeader>(sql, [tenantId, purchaseReturnId]);
  }

  async findPurchaseReturnById(
    tenantId: string,
    purchaseReturnId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<PurchaseReturn | null> {
    const sql = `
      SELECT *
      FROM purchase_returns
      WHERE tenant_id = ? AND id = ?
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, purchaseReturnId]);
    return (rows as PurchaseReturn[])[0] ?? null;
  }

  async findPurchaseReturnByIdForUpdate(
    tenantId: string,
    purchaseReturnId: string,
    executor: Queryable | DatabaseTransaction
  ): Promise<PurchaseReturn | null> {
    const sql = `
      SELECT *
      FROM purchase_returns
      WHERE tenant_id = ? AND id = ?
      LIMIT 1
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [tenantId, purchaseReturnId]);
    return (rows as PurchaseReturn[])[0] ?? null;
  }

  async findPurchaseReturnDetailById(
    tenantId: string,
    purchaseReturnId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<PurchaseReturnListRow | null> {
    const sql = `
      SELECT
        pr.*,
        s.name AS supplier_name,
        w.name AS warehouse_name,
        po.purchase_order_number,
        rc.receipt_number
      FROM purchase_returns pr
      INNER JOIN suppliers s ON s.id = pr.supplier_id AND s.tenant_id = pr.tenant_id AND s.deleted_at IS NULL
      INNER JOIN warehouses w ON w.id = pr.warehouse_id AND w.tenant_id = pr.tenant_id AND w.deleted_at IS NULL
      LEFT JOIN purchase_orders po ON po.id = pr.purchase_order_id AND po.tenant_id = pr.tenant_id AND po.deleted_at IS NULL
      INNER JOIN purchase_receipts rc ON rc.id = pr.purchase_receipt_id AND rc.tenant_id = pr.tenant_id
      WHERE pr.tenant_id = ? AND pr.id = ?
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, purchaseReturnId]);
    return (rows as PurchaseReturnListRow[])[0] ?? null;
  }

  async listPurchaseReturns(
    tenantId: string,
    filters: PurchaseReturnListFilters
  ): Promise<PurchaseReturnListRow[]> {
    const params: Array<string | number> = [tenantId];
    const where = ['pr.tenant_id = ?'];
    if (filters.search) {
      where.push('(pr.purchase_return_number LIKE ? OR s.name LIKE ? OR pr.notes LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search, search);
    }
    if (filters.status) {
      where.push('pr.status = ?');
      params.push(filters.status);
    }
    if (filters.supplierId) {
      where.push('pr.supplier_id = ?');
      params.push(filters.supplierId);
    }
    if (filters.warehouseId) {
      where.push('pr.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    if (filters.purchaseOrderId) {
      where.push('pr.purchase_order_id = ?');
      params.push(filters.purchaseOrderId);
    }
    if (filters.purchaseReceiptId) {
      where.push('pr.purchase_receipt_id = ?');
      params.push(filters.purchaseReceiptId);
    }
    if (filters.purchaseReturnNumber) {
      where.push('pr.purchase_return_number = ?');
      params.push(filters.purchaseReturnNumber);
    }
    if (filters.dateFrom) {
      where.push('pr.return_date >= ?');
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.push('pr.return_date <= ?');
      params.push(filters.dateTo);
    }

    const limit = Number(filters.limit);
    const offset = (Number(filters.page) - 1) * limit;
    const sql = `
      SELECT
        pr.*,
        s.name AS supplier_name,
        w.name AS warehouse_name,
        po.purchase_order_number,
        rc.receipt_number
      FROM purchase_returns pr
      INNER JOIN suppliers s ON s.id = pr.supplier_id AND s.tenant_id = pr.tenant_id AND s.deleted_at IS NULL
      INNER JOIN warehouses w ON w.id = pr.warehouse_id AND w.tenant_id = pr.tenant_id AND w.deleted_at IS NULL
      LEFT JOIN purchase_orders po ON po.id = pr.purchase_order_id AND po.tenant_id = pr.tenant_id AND po.deleted_at IS NULL
      INNER JOIN purchase_receipts rc ON rc.id = pr.purchase_receipt_id AND rc.tenant_id = pr.tenant_id
      WHERE ${where.join(' AND ')}
      ORDER BY pr.${filters.sortBy} ${filters.sortDir}, pr.id ${filters.sortDir}
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, params);
    return rows as PurchaseReturnListRow[];
  }

  async countPurchaseReturns(tenantId: string, filters: PurchaseReturnListFilters): Promise<number> {
    const params: Array<string | number> = [tenantId];
    const where = ['pr.tenant_id = ?'];
    if (filters.search) {
      where.push('(pr.purchase_return_number LIKE ? OR s.name LIKE ? OR pr.notes LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search, search);
    }
    if (filters.status) {
      where.push('pr.status = ?');
      params.push(filters.status);
    }
    if (filters.supplierId) {
      where.push('pr.supplier_id = ?');
      params.push(filters.supplierId);
    }
    if (filters.warehouseId) {
      where.push('pr.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    if (filters.purchaseOrderId) {
      where.push('pr.purchase_order_id = ?');
      params.push(filters.purchaseOrderId);
    }
    if (filters.purchaseReceiptId) {
      where.push('pr.purchase_receipt_id = ?');
      params.push(filters.purchaseReceiptId);
    }
    if (filters.purchaseReturnNumber) {
      where.push('pr.purchase_return_number = ?');
      params.push(filters.purchaseReturnNumber);
    }
    if (filters.dateFrom) {
      where.push('pr.return_date >= ?');
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.push('pr.return_date <= ?');
      params.push(filters.dateTo);
    }

    const sql = `
      SELECT COUNT(*) AS total
      FROM purchase_returns pr
      INNER JOIN suppliers s ON s.id = pr.supplier_id AND s.tenant_id = pr.tenant_id AND s.deleted_at IS NULL
      WHERE ${where.join(' AND ')}
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async listPurchaseReturnItems(
    tenantId: string,
    purchaseReturnId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<PurchaseReturnItemDetailRow[]> {
    const sql = `
      SELECT
        pri.*,
        p.name AS product_name,
        pv.name AS variant_name,
        COALESCE(p.product_type, pp.product_type) AS product_type,
        COALESCE(pv.sku, p.sku, pp.sku) AS sku,
        wb.name AS bin_name,
        rci.purchase_order_item_id,
        rc.receipt_number,
        po.purchase_order_number
      FROM purchase_return_items pri
      INNER JOIN purchase_receipt_items rci
        ON rci.id = pri.purchase_receipt_item_id
       AND rci.tenant_id = pri.tenant_id
      INNER JOIN purchase_receipts rc
        ON rc.id = rci.purchase_receipt_id
       AND rc.tenant_id = pri.tenant_id
      INNER JOIN purchase_orders po
        ON po.id = rc.purchase_order_id
       AND po.tenant_id = pri.tenant_id
       AND po.deleted_at IS NULL
      LEFT JOIN products p
        ON p.id = pri.product_id
       AND p.tenant_id = pri.tenant_id
       AND p.deleted_at IS NULL
      LEFT JOIN product_variants pv
        ON pv.id = pri.product_variant_id
       AND pv.tenant_id = pri.tenant_id
       AND pv.deleted_at IS NULL
      LEFT JOIN products pp
        ON pp.id = pv.product_id
       AND pp.tenant_id = pri.tenant_id
       AND pp.deleted_at IS NULL
      LEFT JOIN warehouse_bins wb
        ON wb.id = pri.bin_id
       AND wb.tenant_id = pri.tenant_id
       AND wb.deleted_at IS NULL
      WHERE pri.tenant_id = ? AND pri.purchase_return_id = ?
      ORDER BY pri.created_at ASC, pri.id ASC
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, purchaseReturnId]);
    return rows as PurchaseReturnItemDetailRow[];
  }

  async getPurchaseReceiptReference(
    tenantId: string,
    purchaseReceiptId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<PurchaseReturnReferenceRow | null> {
    const sql = `
      SELECT
        rc.id AS receipt_id,
        rc.status AS receipt_status,
        rc.receipt_number,
        rc.receipt_date,
        po.id AS purchase_order_id,
        po.purchase_order_number,
        s.id AS supplier_id,
        s.name AS supplier_name,
        w.id AS warehouse_id,
        w.name AS warehouse_name
      FROM purchase_receipts rc
      INNER JOIN purchase_orders po ON po.id = rc.purchase_order_id AND po.tenant_id = rc.tenant_id AND po.deleted_at IS NULL
      INNER JOIN suppliers s ON s.id = rc.supplier_id AND s.tenant_id = rc.tenant_id AND s.deleted_at IS NULL
      INNER JOIN warehouses w ON w.id = rc.warehouse_id AND w.tenant_id = rc.tenant_id AND w.deleted_at IS NULL
      WHERE rc.tenant_id = ? AND rc.id = ?
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, purchaseReceiptId]);
    return (rows as PurchaseReturnReferenceRow[])[0] ?? null;
  }

  async listPurchaseReceiptReferenceItems(
    tenantId: string,
    purchaseReceiptId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<PurchaseReturnReferenceItemRow[]> {
    const sql = `
      SELECT
        rci.*,
        COALESCE(p.name, pp.name) AS product_name,
        pv.name AS variant_name,
        COALESCE(p.product_type, pp.product_type) AS product_type,
        COALESCE(p.status, pp.status) AS product_status,
        COALESCE(p.track_inventory, pp.track_inventory) AS track_inventory,
        COALESCE(p.allow_returns, pp.allow_returns) AS allow_returns,
        COALESCE(p.is_purchasable, pp.is_purchasable) AS is_purchasable,
        COALESCE(pv.sku, p.sku, pp.sku) AS sku
      FROM purchase_receipt_items rci
      LEFT JOIN products p ON p.id = rci.product_id AND p.tenant_id = rci.tenant_id AND p.deleted_at IS NULL
      LEFT JOIN product_variants pv ON pv.id = rci.product_variant_id AND pv.tenant_id = rci.tenant_id AND pv.deleted_at IS NULL
      LEFT JOIN products pp ON pp.id = pv.product_id AND pp.tenant_id = rci.tenant_id AND pp.deleted_at IS NULL
      WHERE rci.tenant_id = ? AND rci.purchase_receipt_id = ?
      ORDER BY rci.created_at ASC, rci.id ASC
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, purchaseReceiptId]);
    return rows as PurchaseReturnReferenceItemRow[];
  }

  async sumReturnedQuantityByReceiptItem(
    tenantId: string,
    purchaseReceiptItemIds: string[],
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<Map<string, number>> {
    if (purchaseReceiptItemIds.length === 0) {
      return new Map();
    }

    const placeholders = purchaseReceiptItemIds.map(() => '?').join(', ');
    const sql = `
      SELECT
        pri.purchase_receipt_item_id,
        COALESCE(SUM(pri.returned_quantity), 0) AS total_returned
      FROM purchase_return_items pri
      INNER JOIN purchase_returns pr
        ON pr.id = pri.purchase_return_id
       AND pr.tenant_id = pri.tenant_id
      WHERE pri.tenant_id = ?
        AND pri.purchase_receipt_item_id IN (${placeholders})
        AND pr.status = 'POSTED'
      GROUP BY pri.purchase_receipt_item_id
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, ...purchaseReceiptItemIds]);
    return new Map(
      rows.map((row) => [String(row.purchase_receipt_item_id), Number(row.total_returned)])
    );
  }
}
