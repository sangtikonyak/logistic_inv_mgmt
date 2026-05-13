import mysql from 'mysql2/promise';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import {
  ProcurementRequisition,
  ProcurementRequisitionItem,
  ProcurementRequisitionItemDetailRow,
  ProcurementRequisitionListFilters,
  ProcurementRequisitionListRow,
} from '../types/procurement.types';

export class ProcurementRepository {
  constructor(private readonly executor: Queryable) {}

  async createRequisition(
    requisition: Omit<ProcurementRequisition, 'created_at' | 'updated_at'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO procurement_requisitions
      (
        id, tenant_id, requisition_number, warehouse_id, requested_by, status,
        required_by_date, notes, submitted_at, approved_at, rejected_at, cancelled_at,
        created_by, updated_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      requisition.id,
      requisition.tenant_id,
      requisition.requisition_number,
      requisition.warehouse_id,
      requisition.requested_by,
      requisition.status,
      requisition.required_by_date,
      requisition.notes,
      requisition.submitted_at,
      requisition.approved_at,
      requisition.rejected_at,
      requisition.cancelled_at,
      requisition.created_by,
      requisition.updated_by,
    ]);
  }

  async createRequisitionItem(
    item: ProcurementRequisitionItem,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO procurement_requisition_items
      (
        id, tenant_id, procurement_requisition_id, product_id, product_variant_id,
        requested_quantity, approved_quantity, estimated_unit_cost, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      item.id,
      item.tenant_id,
      item.procurement_requisition_id,
      item.product_id,
      item.product_variant_id,
      item.requested_quantity,
      item.approved_quantity,
      item.estimated_unit_cost,
      item.notes,
    ]);
  }

  async findRequisitionById(
    tenantId: string,
    requisitionId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<ProcurementRequisition | null> {
    const sql = `
      SELECT *
      FROM procurement_requisitions
      WHERE tenant_id = ? AND id = ?
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, requisitionId]);
    return (rows as ProcurementRequisition[])[0] ?? null;
  }

  async findRequisitionByIdForUpdate(
    tenantId: string,
    requisitionId: string,
    executor: Queryable | DatabaseTransaction
  ): Promise<ProcurementRequisition | null> {
    const sql = `
      SELECT *
      FROM procurement_requisitions
      WHERE tenant_id = ? AND id = ?
      LIMIT 1
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [tenantId, requisitionId]);
    return (rows as ProcurementRequisition[])[0] ?? null;
  }

  async findRequisitionDetailById(
    tenantId: string,
    requisitionId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<ProcurementRequisitionListRow | null> {
    const sql = `
      SELECT
        pr.*,
        w.name AS warehouse_name,
        u.email AS requested_by_name
      FROM procurement_requisitions pr
      INNER JOIN warehouses w ON w.id = pr.warehouse_id AND w.tenant_id = pr.tenant_id AND w.deleted_at IS NULL
      INNER JOIN users u ON u.id = pr.requested_by AND u.tenant_id = pr.tenant_id
      WHERE pr.tenant_id = ? AND pr.id = ?
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, requisitionId]);
    return (rows as ProcurementRequisitionListRow[])[0] ?? null;
  }

  async listRequisitions(tenantId: string, filters: ProcurementRequisitionListFilters): Promise<ProcurementRequisitionListRow[]> {
    const params: Array<string | number> = [tenantId];
    const where = ['pr.tenant_id = ?'];
    if (filters.status) {
      where.push('pr.status = ?');
      params.push(filters.status);
    }
    if (filters.warehouseId) {
      where.push('pr.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    if (filters.search) {
      where.push('(pr.requisition_number LIKE ? OR w.name LIKE ? OR u.email LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search, search);
    }

    const limit = Number(filters.limit);
    const offset = (Number(filters.page) - 1) * limit;
    const sql = `
      SELECT
        pr.*,
        w.name AS warehouse_name,
        u.email AS requested_by_name
      FROM procurement_requisitions pr
      INNER JOIN warehouses w ON w.id = pr.warehouse_id AND w.tenant_id = pr.tenant_id AND w.deleted_at IS NULL
      INNER JOIN users u ON u.id = pr.requested_by AND u.tenant_id = pr.tenant_id
      WHERE ${where.join(' AND ')}
      ORDER BY pr.created_at DESC, pr.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, params);
    return rows as ProcurementRequisitionListRow[];
  }

  async countRequisitions(tenantId: string, filters: ProcurementRequisitionListFilters): Promise<number> {
    const params: Array<string | number> = [tenantId];
    const where = ['pr.tenant_id = ?'];
    if (filters.status) {
      where.push('pr.status = ?');
      params.push(filters.status);
    }
    if (filters.warehouseId) {
      where.push('pr.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    if (filters.search) {
      where.push('(pr.requisition_number LIKE ? OR w.name LIKE ? OR u.email LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search, search);
    }

    const sql = `
      SELECT COUNT(*) AS total
      FROM procurement_requisitions pr
      INNER JOIN warehouses w ON w.id = pr.warehouse_id AND w.tenant_id = pr.tenant_id AND w.deleted_at IS NULL
      INNER JOIN users u ON u.id = pr.requested_by AND u.tenant_id = pr.tenant_id
      WHERE ${where.join(' AND ')}
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async listRequisitionItems(
    tenantId: string,
    requisitionId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<ProcurementRequisitionItemDetailRow[]> {
    const sql = `
      SELECT
        pri.*,
        p.name AS product_name,
        pv.name AS variant_name,
        COALESCE(pv.sku, p.sku) AS sku
      FROM procurement_requisition_items pri
      LEFT JOIN products p ON p.id = pri.product_id AND p.tenant_id = pri.tenant_id AND p.deleted_at IS NULL
      LEFT JOIN product_variants pv ON pv.id = pri.product_variant_id AND pv.tenant_id = pri.tenant_id AND pv.deleted_at IS NULL
      WHERE pri.tenant_id = ? AND pri.procurement_requisition_id = ?
      ORDER BY pri.created_at ASC, pri.id ASC
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, requisitionId]);
    return rows as ProcurementRequisitionItemDetailRow[];
  }

  async findPurchasableItemReference(
    tenantId: string,
    input: { productId?: string; productVariantId?: string },
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<boolean> {
    if (input.productId) {
      const sql = `
        SELECT COUNT(*) AS total
        FROM products p
        WHERE p.id = ? AND p.tenant_id = ? AND p.deleted_at IS NULL AND p.is_purchasable = 1 AND p.status = 'ACTIVE'
      `;
      const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [input.productId, tenantId]);
      return Number((rows[0] as { total: number } | undefined)?.total ?? 0) > 0;
    }

    if (input.productVariantId) {
      const sql = `
        SELECT COUNT(*) AS total
        FROM product_variants pv
        INNER JOIN products p ON p.id = pv.product_id AND p.tenant_id = pv.tenant_id
        WHERE pv.id = ? AND pv.tenant_id = ? AND pv.deleted_at IS NULL AND p.deleted_at IS NULL
          AND p.is_purchasable = 1 AND p.status = 'ACTIVE'
      `;
      const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [input.productVariantId, tenantId]);
      return Number((rows[0] as { total: number } | undefined)?.total ?? 0) > 0;
    }

    return false;
  }

  async updateRequisitionStatus(
    tenantId: string,
    requisitionId: string,
    payload: {
      status: string;
      approvedAt?: Date | null;
      rejectedAt?: Date | null;
      submittedAt?: Date | null;
      cancelledAt?: Date | null;
      updatedBy: string;
    },
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE procurement_requisitions
      SET
        status = ?,
        submitted_at = ?,
        approved_at = ?,
        rejected_at = ?,
        cancelled_at = ?,
        updated_by = ?,
        updated_at = NOW()
      WHERE tenant_id = ? AND id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.status,
      payload.submittedAt ?? null,
      payload.approvedAt ?? null,
      payload.rejectedAt ?? null,
      payload.cancelledAt ?? null,
      payload.updatedBy,
      tenantId,
      requisitionId,
    ]);
  }
}
