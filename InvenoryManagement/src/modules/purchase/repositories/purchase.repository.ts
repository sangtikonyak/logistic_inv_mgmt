import mysql from 'mysql2/promise';
import crypto from 'node:crypto';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import {
  PurchaseItemReference,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderItemDetailRow,
  PurchaseOrderListFilters,
  PurchaseOrderListRow,
  PurchaseReceipt,
  PurchaseReceiptItem,
  PurchaseReceiptItemDetailRow,
  PurchaseReceiptListFilters,
  PurchaseReceiptListRow,
  Supplier,
  SupplierListFilters,
} from '../types/purchase.types';

export class PurchaseRepository {
  constructor(private readonly executor: Queryable) {}

  async createSupplier(
    supplier: Omit<Supplier, 'created_at' | 'updated_at' | 'deleted_at'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO suppliers
      (
        id, tenant_id, name, code, email, phone, contact_person, tax_number,
        address_line_1, address_line_2, city, state, postal_code, country,
        tier, rating, vendor_type, status, notes, created_by, updated_by, deleted_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      supplier.id,
      supplier.tenant_id,
      supplier.name,
      supplier.code,
      supplier.email,
      supplier.phone,
      supplier.contact_person,
      supplier.tax_number,
      supplier.address_line_1,
      supplier.address_line_2,
      supplier.city,
      supplier.state,
      supplier.postal_code,
      supplier.country,
      supplier.tier,
      supplier.rating,
      supplier.vendor_type,
      supplier.status,
      supplier.notes,
      supplier.created_by,
      supplier.updated_by,
      supplier.deleted_by,
    ]);
  }

  async updateSupplier(
    tenantId: string,
    supplierId: string,
    payload: {
      name: string;
      code: string;
      email: string | null;
      phone: string | null;
      contact_person: string | null;
      tax_number: string | null;
      address_line_1: string | null;
      address_line_2: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
      tier: string;
      rating: number;
      vendor_type: string;
      status: string;
      notes: string | null;
      updated_by: string;
    },
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE suppliers
      SET
        name = ?, code = ?, email = ?, phone = ?, contact_person = ?, tax_number = ?,
        address_line_1 = ?, address_line_2 = ?, city = ?, state = ?, postal_code = ?, country = ?,
        tier = ?, rating = ?, vendor_type = ?, status = ?, notes = ?, updated_by = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.name,
      payload.code,
      payload.email,
      payload.phone,
      payload.contact_person,
      payload.tax_number,
      payload.address_line_1,
      payload.address_line_2,
      payload.city,
      payload.state,
      payload.postal_code,
      payload.country,
      payload.tier,
      payload.rating,
      payload.vendor_type,
      payload.status,
      payload.notes,
      payload.updated_by,
      tenantId,
      supplierId,
    ]);
  }

  async softDeleteSupplier(
    tenantId: string,
    supplierId: string,
    actorUserId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE suppliers
      SET deleted_at = NOW(), deleted_by = ?, updated_by = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [actorUserId, actorUserId, tenantId, supplierId]);
  }

  async findSupplierById(
    tenantId: string,
    supplierId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<Supplier | null> {
    const sql = `
      SELECT *
      FROM suppliers
      WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, supplierId]);
    return (rows as Supplier[])[0] ?? null;
  }

  async findSupplierByCode(
    tenantId: string,
    code: string,
    excludeSupplierId?: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<Supplier | null> {
    const params: string[] = [tenantId, code];
    let sql = `
      SELECT *
      FROM suppliers
      WHERE tenant_id = ? AND code = ? AND deleted_at IS NULL
    `;
    if (excludeSupplierId) {
      sql += ' AND id <> ?';
      params.push(excludeSupplierId);
    }
    sql += ' LIMIT 1';
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, params);
    return (rows as Supplier[])[0] ?? null;
  }

  async listSuppliers(tenantId: string, filters: SupplierListFilters): Promise<Supplier[]> {
    const params: Array<string | number> = [tenantId];
    const where = ['tenant_id = ?', 'deleted_at IS NULL'];
    if (filters.search) {
      where.push('(name LIKE ? OR code LIKE ? OR email LIKE ? OR contact_person LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search, search, search);
    }
    if (filters.status) {
      where.push('status = ?');
      params.push(filters.status);
    }

    const limit = Number(filters.limit);
    const offset = (Number(filters.page) - 1) * limit;
    const sql = `
      SELECT *
      FROM suppliers
      WHERE ${where.join(' AND ')}
      ORDER BY ${filters.sortBy} ${filters.sortDir}, id ${filters.sortDir}
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, params);
    return rows as Supplier[];
  }

  async countSuppliers(tenantId: string, filters: SupplierListFilters): Promise<number> {
    const params: Array<string | number> = [tenantId];
    const where = ['tenant_id = ?', 'deleted_at IS NULL'];
    if (filters.search) {
      where.push('(name LIKE ? OR code LIKE ? OR email LIKE ? OR contact_person LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search, search, search);
    }
    if (filters.status) {
      where.push('status = ?');
      params.push(filters.status);
    }

    const sql = `SELECT COUNT(*) AS total FROM suppliers WHERE ${where.join(' AND ')}`;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async countActiveOrdersForSupplier(
    tenantId: string,
    supplierId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<number> {
    const sql = `
      SELECT COUNT(*) AS total
      FROM purchase_orders
      WHERE tenant_id = ? AND supplier_id = ? AND deleted_at IS NULL AND status <> 'CANCELLED'
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, supplierId]);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async createPurchaseOrder(
    order: Omit<PurchaseOrder, 'created_at' | 'updated_at' | 'deleted_at'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO purchase_orders
      (
        id, tenant_id, supplier_id, warehouse_id, purchase_order_number, status,
        order_date, expected_date, currency_code, payment_type, payment_status, payment_mode,
        subtotal_amount, tax_amount, discount_amount, total_amount, notes, created_by,
        updated_by, deleted_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      order.id,
      order.tenant_id,
      order.supplier_id,
      order.warehouse_id,
      order.purchase_order_number,
      order.status,
      order.order_date,
      order.expected_date,
      order.currency_code,
      order.payment_type,
      order.payment_status,
      order.payment_mode,
      order.subtotal_amount,
      order.tax_amount,
      order.discount_amount,
      order.total_amount,
      order.notes,
      order.created_by,
      order.updated_by,
      order.deleted_by,
    ]);
  }

  async updatePurchaseOrder(
    tenantId: string,
    purchaseOrderId: string,
    payload: {
      supplier_id: string;
      warehouse_id: string;
      order_date: Date;
      expected_date: Date | null;
      currency_code: string | null;
      payment_type: string;
      payment_status: string;
      payment_mode: string;
      subtotal_amount: string;
      tax_amount: string;
      discount_amount: string;
      total_amount: string;
      notes: string | null;
      updated_by: string;
    },
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE purchase_orders
      SET
        supplier_id = ?, warehouse_id = ?, order_date = ?, expected_date = ?,
        currency_code = ?, payment_type = ?, payment_status = ?, payment_mode = ?, subtotal_amount = ?,
        tax_amount = ?, discount_amount = ?, total_amount = ?, notes = ?, updated_by = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.supplier_id,
      payload.warehouse_id,
      payload.order_date,
      payload.expected_date,
      payload.currency_code,
      payload.payment_type,
      payload.payment_status,
      payload.payment_mode,
      payload.subtotal_amount,
      payload.tax_amount,
      payload.discount_amount,
      payload.total_amount,
      payload.notes,
      payload.updated_by,
      tenantId,
      purchaseOrderId,
    ]);
  }

  async updatePurchaseOrderStatus(
    tenantId: string,
    purchaseOrderId: string,
    payload: { status: string; updatedBy: string },
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE purchase_orders
      SET status = ?, updated_by = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.status,
      payload.updatedBy,
      tenantId,
      purchaseOrderId,
    ]);
  }

  async findPurchaseOrderById(
    tenantId: string,
    purchaseOrderId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<PurchaseOrder | null> {
    const sql = `
      SELECT *
      FROM purchase_orders
      WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, purchaseOrderId]);
    return (rows as PurchaseOrder[])[0] ?? null;
  }

  async findPurchaseOrderByIdForUpdate(
    tenantId: string,
    purchaseOrderId: string,
    executor: Queryable | DatabaseTransaction
  ): Promise<PurchaseOrder | null> {
    const sql = `
      SELECT *
      FROM purchase_orders
      WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL
      LIMIT 1
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [tenantId, purchaseOrderId]);
    return (rows as PurchaseOrder[])[0] ?? null;
  }

  async findPurchaseOrderDetailById(
    tenantId: string,
    purchaseOrderId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<PurchaseOrderListRow | null> {
    const sql = `
      SELECT
        po.*,
        s.name AS supplier_name,
        w.name AS warehouse_name
      FROM purchase_orders po
      INNER JOIN suppliers s ON s.id = po.supplier_id AND s.tenant_id = po.tenant_id AND s.deleted_at IS NULL
      INNER JOIN warehouses w ON w.id = po.warehouse_id AND w.tenant_id = po.tenant_id AND w.deleted_at IS NULL
      WHERE po.tenant_id = ? AND po.id = ? AND po.deleted_at IS NULL
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, purchaseOrderId]);
    return (rows as PurchaseOrderListRow[])[0] ?? null;
  }

  async listPurchaseOrders(tenantId: string, filters: PurchaseOrderListFilters): Promise<PurchaseOrderListRow[]> {
    const params: Array<string | number> = [tenantId];
    const where = ['po.tenant_id = ?', 'po.deleted_at IS NULL'];
    if (filters.search) {
      where.push('(po.purchase_order_number LIKE ? OR s.name LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search);
    }
    if (filters.status) {
      where.push('po.status = ?');
      params.push(filters.status);
    }
    if (filters.supplierId) {
      where.push('po.supplier_id = ?');
      params.push(filters.supplierId);
    }
    if (filters.warehouseId) {
      where.push('po.warehouse_id = ?');
      params.push(filters.warehouseId);
    }

    const limit = Number(filters.limit);
    const offset = (Number(filters.page) - 1) * limit;
    const sql = `
      SELECT
        po.*,
        s.name AS supplier_name,
        w.name AS warehouse_name
      FROM purchase_orders po
      INNER JOIN suppliers s ON s.id = po.supplier_id AND s.tenant_id = po.tenant_id AND s.deleted_at IS NULL
      INNER JOIN warehouses w ON w.id = po.warehouse_id AND w.tenant_id = po.tenant_id AND w.deleted_at IS NULL
      WHERE ${where.join(' AND ')}
      ORDER BY po.created_at DESC, po.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, params);
    return rows as PurchaseOrderListRow[];
  }

  async countPurchaseOrders(tenantId: string, filters: PurchaseOrderListFilters): Promise<number> {
    const params: Array<string | number> = [tenantId];
    const where = ['po.tenant_id = ?', 'po.deleted_at IS NULL'];
    if (filters.search) {
      where.push('(po.purchase_order_number LIKE ? OR s.name LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search);
    }
    if (filters.status) {
      where.push('po.status = ?');
      params.push(filters.status);
    }
    if (filters.supplierId) {
      where.push('po.supplier_id = ?');
      params.push(filters.supplierId);
    }
    if (filters.warehouseId) {
      where.push('po.warehouse_id = ?');
      params.push(filters.warehouseId);
    }

    const sql = `
      SELECT COUNT(*) AS total
      FROM purchase_orders po
      INNER JOIN suppliers s ON s.id = po.supplier_id AND s.tenant_id = po.tenant_id AND s.deleted_at IS NULL
      WHERE ${where.join(' AND ')}
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async createPurchaseOrderItem(
    item: PurchaseOrderItem,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO purchase_order_items
      (
        id, tenant_id, purchase_order_id, product_id, product_variant_id,
        ordered_quantity, received_quantity, unit_cost, tax_amount, discount_amount,
        line_total, procurement_requisition_item_id, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      item.id,
      item.tenant_id,
      item.purchase_order_id,
      item.product_id,
      item.product_variant_id,
      item.ordered_quantity,
      item.received_quantity,
      item.unit_cost,
      item.tax_amount,
      item.discount_amount,
      item.line_total,
      item.procurement_requisition_item_id ?? null,
      item.notes,
    ]);
  }

  async deletePurchaseOrderItems(
    tenantId: string,
    purchaseOrderId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `DELETE FROM purchase_order_items WHERE tenant_id = ? AND purchase_order_id = ?`;
    await executor.execute<mysql.ResultSetHeader>(sql, [tenantId, purchaseOrderId]);
  }

  async listPurchaseOrderItems(
    tenantId: string,
    purchaseOrderId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<PurchaseOrderItemDetailRow[]> {
    const sql = `
      SELECT
        poi.*,
        p.name AS product_name,
        pv.name AS variant_name,
        p.product_type,
        COALESCE(pv.sku, p.sku) AS sku
      FROM purchase_order_items poi
      LEFT JOIN products p ON p.id = poi.product_id AND p.tenant_id = poi.tenant_id AND p.deleted_at IS NULL
      LEFT JOIN product_variants pv ON pv.id = poi.product_variant_id AND pv.tenant_id = poi.tenant_id AND pv.deleted_at IS NULL
      WHERE poi.tenant_id = ? AND poi.purchase_order_id = ?
      ORDER BY poi.created_at ASC, poi.id ASC
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, purchaseOrderId]);
    return rows as PurchaseOrderItemDetailRow[];
  }

  async listPurchaseOrderItemsForUpdate(
    tenantId: string,
    purchaseOrderId: string,
    executor: Queryable | DatabaseTransaction
  ): Promise<PurchaseOrderItem[]> {
    const sql = `
      SELECT *
      FROM purchase_order_items
      WHERE tenant_id = ? AND purchase_order_id = ?
      ORDER BY created_at ASC, id ASC
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [tenantId, purchaseOrderId]);
    return rows as PurchaseOrderItem[];
  }

  async findPurchaseOrderItemByIdForUpdate(
    tenantId: string,
    purchaseOrderItemId: string,
    executor: Queryable | DatabaseTransaction
  ): Promise<PurchaseOrderItem | null> {
    const sql = `
      SELECT *
      FROM purchase_order_items
      WHERE tenant_id = ? AND id = ?
      LIMIT 1
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [tenantId, purchaseOrderItemId]);
    return (rows as PurchaseOrderItem[])[0] ?? null;
  }

  async updatePurchaseOrderItemReceivedQuantity(
    tenantId: string,
    purchaseOrderItemId: string,
    receivedQuantity: string,
    executor: Queryable | DatabaseTransaction
  ) {
    const sql = `
      UPDATE purchase_order_items
      SET received_quantity = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [receivedQuantity, tenantId, purchaseOrderItemId]);
  }

  async createPurchaseReceipt(
    receipt: Omit<PurchaseReceipt, 'created_at' | 'updated_at'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO purchase_receipts
      (
        id, tenant_id, purchase_order_id, supplier_id, warehouse_id,
        receipt_number, receipt_date, status, notes, created_by, updated_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      receipt.id,
      receipt.tenant_id,
      receipt.purchase_order_id,
      receipt.supplier_id,
      receipt.warehouse_id,
      receipt.receipt_number,
      receipt.receipt_date,
      receipt.status,
      receipt.notes,
      receipt.created_by,
      receipt.updated_by,
    ]);
  }

  async createPurchaseReceiptItem(
    item: PurchaseReceiptItem,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO purchase_receipt_items
      (
        id, tenant_id, purchase_receipt_id, purchase_order_item_id, product_id,
        product_variant_id, bin_id, lot_id, container_id, lot_number, container_code, expiry_date,
        received_quantity, accepted_quantity, rejected_quantity, unit_cost, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      item.id,
      item.tenant_id,
      item.purchase_receipt_id,
      item.purchase_order_item_id,
      item.product_id,
      item.product_variant_id,
      item.bin_id,
      item.lot_id,
      item.container_id,
      item.lot_number,
      item.container_code,
      item.expiry_date,
      item.received_quantity,
      item.accepted_quantity,
      item.rejected_quantity,
      item.unit_cost,
    ]);
  }

  async findPurchaseReceiptById(
    tenantId: string,
    receiptId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<PurchaseReceipt | null> {
    const sql = `
      SELECT *
      FROM purchase_receipts
      WHERE tenant_id = ? AND id = ?
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, receiptId]);
    return (rows as PurchaseReceipt[])[0] ?? null;
  }

  async findPurchaseReceiptByIdForUpdate(
    tenantId: string,
    receiptId: string,
    executor: Queryable | DatabaseTransaction
  ): Promise<PurchaseReceipt | null> {
    const sql = `
      SELECT *
      FROM purchase_receipts
      WHERE tenant_id = ? AND id = ?
      LIMIT 1
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [tenantId, receiptId]);
    return (rows as PurchaseReceipt[])[0] ?? null;
  }

  async findPurchaseReceiptDetailById(
    tenantId: string,
    receiptId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<PurchaseReceiptListRow | null> {
    const sql = `
      SELECT
        pr.*,
        po.purchase_order_number,
        s.name AS supplier_name,
        w.name AS warehouse_name
      FROM purchase_receipts pr
      INNER JOIN purchase_orders po ON po.id = pr.purchase_order_id AND po.tenant_id = pr.tenant_id AND po.deleted_at IS NULL
      INNER JOIN suppliers s ON s.id = pr.supplier_id AND s.tenant_id = pr.tenant_id AND s.deleted_at IS NULL
      INNER JOIN warehouses w ON w.id = pr.warehouse_id AND w.tenant_id = pr.tenant_id AND w.deleted_at IS NULL
      WHERE pr.tenant_id = ? AND pr.id = ?
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, receiptId]);
    return (rows as PurchaseReceiptListRow[])[0] ?? null;
  }

  async listPurchaseReceipts(tenantId: string, filters: PurchaseReceiptListFilters): Promise<PurchaseReceiptListRow[]> {
    const params: Array<string | number> = [tenantId];
    const where = ['pr.tenant_id = ?'];
    if (filters.status) {
      where.push('pr.status = ?');
      params.push(filters.status);
    }
    if (filters.purchaseOrderId) {
      where.push('pr.purchase_order_id = ?');
      params.push(filters.purchaseOrderId);
    }
    if (filters.supplierId) {
      where.push('pr.supplier_id = ?');
      params.push(filters.supplierId);
    }
    if (filters.warehouseId) {
      where.push('pr.warehouse_id = ?');
      params.push(filters.warehouseId);
    }

    const limit = Number(filters.limit);
    const offset = (Number(filters.page) - 1) * limit;
    const sql = `
      SELECT
        pr.*,
        po.purchase_order_number,
        s.name AS supplier_name,
        w.name AS warehouse_name
      FROM purchase_receipts pr
      INNER JOIN purchase_orders po ON po.id = pr.purchase_order_id AND po.tenant_id = pr.tenant_id AND po.deleted_at IS NULL
      INNER JOIN suppliers s ON s.id = pr.supplier_id AND s.tenant_id = pr.tenant_id AND s.deleted_at IS NULL
      INNER JOIN warehouses w ON w.id = pr.warehouse_id AND w.tenant_id = pr.tenant_id AND w.deleted_at IS NULL
      WHERE ${where.join(' AND ')}
      ORDER BY pr.created_at DESC, pr.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, params);
    return rows as PurchaseReceiptListRow[];
  }

  async countPurchaseReceipts(tenantId: string, filters: PurchaseReceiptListFilters): Promise<number> {
    const params: Array<string | number> = [tenantId];
    const where = ['tenant_id = ?'];
    if (filters.status) {
      where.push('status = ?');
      params.push(filters.status);
    }
    if (filters.purchaseOrderId) {
      where.push('purchase_order_id = ?');
      params.push(filters.purchaseOrderId);
    }
    if (filters.supplierId) {
      where.push('supplier_id = ?');
      params.push(filters.supplierId);
    }
    if (filters.warehouseId) {
      where.push('warehouse_id = ?');
      params.push(filters.warehouseId);
    }

    const sql = `SELECT COUNT(*) AS total FROM purchase_receipts WHERE ${where.join(' AND ')}`;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async listPurchaseReceiptItems(
    tenantId: string,
    receiptId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<PurchaseReceiptItemDetailRow[]> {
    const sql = `
      SELECT
        pri.*,
        p.name AS product_name,
        pv.name AS variant_name,
        p.product_type,
        COALESCE(pv.sku, p.sku) AS sku,
        wb.name AS bin_name,
        il.lot_number,
        ic.container_code
      FROM purchase_receipt_items pri
      LEFT JOIN products p ON p.id = pri.product_id AND p.tenant_id = pri.tenant_id AND p.deleted_at IS NULL
      LEFT JOIN product_variants pv ON pv.id = pri.product_variant_id AND pv.tenant_id = pri.tenant_id AND pv.deleted_at IS NULL
      LEFT JOIN warehouse_bins wb ON wb.id = pri.bin_id AND wb.tenant_id = pri.tenant_id AND wb.deleted_at IS NULL
      LEFT JOIN inventory_lots il ON il.id = pri.lot_id AND il.tenant_id = pri.tenant_id
      LEFT JOIN inventory_containers ic ON ic.id = pri.container_id AND ic.tenant_id = pri.tenant_id
      WHERE pri.tenant_id = ? AND pri.purchase_receipt_id = ?
      ORDER BY pri.created_at ASC, pri.id ASC
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, receiptId]);
    return rows as PurchaseReceiptItemDetailRow[];
  }

  async updatePurchaseReceiptStatus(
    tenantId: string,
    receiptId: string,
    payload: { status: string; updatedBy: string },
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE purchase_receipts
      SET status = ?, updated_by = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.status,
      payload.updatedBy,
      tenantId,
      receiptId,
    ]);
  }

  async findPurchaseItemReference(
    tenantId: string,
    input: { productId?: string | null; productVariantId?: string | null },
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<PurchaseItemReference | null> {
    type RawPurchaseItemReference = {
      productId: string | null;
      productVariantId: string | null;
      productType: string;
      productStatus: string;
      isPurchasable: number;
      trackInventory: number;
      productName: string;
      variantName: string | null;
      sku: string | null;
    };

    if (input.productId) {
      const sql = `
        SELECT
          p.id AS productId,
          NULL AS productVariantId,
          p.product_type AS productType,
          p.status AS productStatus,
          p.is_purchasable AS isPurchasable,
          p.track_inventory AS trackInventory,
          p.name AS productName,
          NULL AS variantName,
          p.sku AS sku
        FROM products p
        WHERE p.id = ? AND p.tenant_id = ? AND p.deleted_at IS NULL
        LIMIT 1
      `;
      const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [input.productId, tenantId]);
      const row = rows[0] as unknown as RawPurchaseItemReference | undefined;
      return row
        ? {
            productId: row.productId,
            productVariantId: row.productVariantId,
            productType: row.productType,
            productStatus: row.productStatus,
            isPurchasable: Boolean(row.isPurchasable),
            trackInventory: Boolean(row.trackInventory),
            productName: row.productName,
            variantName: row.variantName,
            sku: row.sku,
          }
        : null;
    }

    if (input.productVariantId) {
      const sql = `
        SELECT
          NULL AS productId,
          pv.id AS productVariantId,
          p.product_type AS productType,
          p.status AS productStatus,
          p.is_purchasable AS isPurchasable,
          p.track_inventory AS trackInventory,
          p.name AS productName,
          pv.name AS variantName,
          COALESCE(pv.sku, p.sku) AS sku
        FROM product_variants pv
        INNER JOIN products p
          ON p.id = pv.product_id
         AND p.tenant_id = pv.tenant_id
         AND p.deleted_at IS NULL
        WHERE pv.id = ? AND pv.tenant_id = ? AND pv.deleted_at IS NULL
        LIMIT 1
      `;
      const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [input.productVariantId, tenantId]);
      const row = rows[0] as unknown as RawPurchaseItemReference | undefined;
      return row
        ? {
            productId: row.productId,
            productVariantId: row.productVariantId,
            productType: row.productType,
            productStatus: row.productStatus,
            isPurchasable: Boolean(row.isPurchasable),
            trackInventory: Boolean(row.trackInventory),
            productName: row.productName,
            variantName: row.variantName,
            sku: row.sku,
          }
        : null;
    }

    return null;
  }

  async findOrCreateInventoryLot(
    input: {
      tenantId: string;
      warehouseId: string;
      productId: string | null;
      productVariantId: string | null;
      lotNumber: string;
      expiryDate: Date | null;
      supplierId: string;
      purchaseReceiptId: string;
      actorUserId: string;
    },
    executor: Queryable | DatabaseTransaction
  ): Promise<string> {
    const findSql = `
      SELECT id
      FROM inventory_lots
      WHERE tenant_id = ?
        AND warehouse_id = ?
        AND ((product_id IS NULL AND ? IS NULL) OR product_id = ?)
        AND ((product_variant_id IS NULL AND ? IS NULL) OR product_variant_id = ?)
        AND lot_number = ?
      LIMIT 1
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(findSql, [
      input.tenantId,
      input.warehouseId,
      input.productId,
      input.productId,
      input.productVariantId,
      input.productVariantId,
      input.lotNumber,
    ]);
    const existingId = rows[0]?.id ? String(rows[0].id) : null;
    if (existingId) {
      return existingId;
    }

    const id = crypto.randomUUID();
    const createSql = `
      INSERT INTO inventory_lots
      (
        id, tenant_id, warehouse_id, product_id, product_variant_id, lot_number,
        expiry_date, supplier_id, purchase_receipt_id, status, created_by, updated_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(createSql, [
      id,
      input.tenantId,
      input.warehouseId,
      input.productId,
      input.productVariantId,
      input.lotNumber,
      input.expiryDate,
      input.supplierId,
      input.purchaseReceiptId,
      input.actorUserId,
      input.actorUserId,
    ]);
    return id;
  }

  async findOrCreateContainer(
    input: {
      tenantId: string;
      warehouseId: string;
      zoneId: string | null;
      binId: string | null;
      containerCode: string;
      actorUserId: string;
    },
    executor: Queryable | DatabaseTransaction
  ): Promise<string> {
    const findSql = `
      SELECT id
      FROM inventory_containers
      WHERE tenant_id = ? AND container_code = ?
      LIMIT 1
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(findSql, [input.tenantId, input.containerCode]);
    const existingId = rows[0]?.id ? String(rows[0].id) : null;
    if (existingId) {
      return existingId;
    }

    const id = crypto.randomUUID();
    const createSql = `
      INSERT INTO inventory_containers
      (
        id, tenant_id, warehouse_id, zone_id, bin_id, container_code,
        container_type, status, created_by, updated_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'BOX', 'ACTIVE', ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(createSql, [
      id,
      input.tenantId,
      input.warehouseId,
      input.zoneId,
      input.binId,
      input.containerCode,
      input.actorUserId,
      input.actorUserId,
    ]);
    return id;
  }

  async createInventoryContainerItem(
    input: {
      id: string;
      tenantId: string;
      containerId: string;
      warehouseId: string;
      productId: string | null;
      productVariantId: string | null;
      lotId: string | null;
      quantity: string;
      actorUserId: string;
    },
    executor: Queryable | DatabaseTransaction
  ) {
    const sql = `
      INSERT INTO inventory_container_items
      (
        id, tenant_id, container_id, warehouse_id, product_id, product_variant_id, lot_id,
        quantity, created_by, updated_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      input.id,
      input.tenantId,
      input.containerId,
      input.warehouseId,
      input.productId,
      input.productVariantId,
      input.lotId,
      input.quantity,
      input.actorUserId,
      input.actorUserId,
    ]);
  }

  async createInventoryCostLayer(
    input: {
      id: string;
      tenantId: string;
      warehouseId: string;
      productId: string | null;
      productVariantId: string | null;
      lotId: string | null;
      containerId: string | null;
      referenceType: string;
      referenceId: string;
      receiptDate: Date;
      quantity: string;
      unitCost: string;
      currencyCode: string | null;
      createdBy: string;
    },
    executor: Queryable | DatabaseTransaction
  ) {
    const sql = `
      INSERT INTO inventory_cost_layers
      (
        id, tenant_id, warehouse_id, product_id, product_variant_id, lot_id, container_id,
        reference_type, reference_id, receipt_date, qty_received, qty_remaining, unit_cost, landed_cost,
        currency_code, created_by, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      input.id,
      input.tenantId,
      input.warehouseId,
      input.productId,
      input.productVariantId,
      input.lotId,
      input.containerId,
      input.referenceType,
      input.referenceId,
      input.receiptDate,
      input.quantity,
      input.quantity,
      input.unitCost,
      input.currencyCode,
      input.createdBy,
    ]);
  }
}
