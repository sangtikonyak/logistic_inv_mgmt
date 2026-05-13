import mysql from 'mysql2/promise';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import {
  Customer,
  CustomerListFilters,
  SalesItemReference,
  SalesOrder,
  SalesOrderItem,
  SalesOrderItemDetailRow,
  SalesOrderListFilters,
  SalesOrderListRow,
  SalesReservation,
  SalesReservationItem,
  SalesReservationItemDetailRow,
  SalesReservationListFilters,
  SalesReservationListRow,
  SalesShipment,
  SalesShipmentItem,
  SalesShipmentItemDetailRow,
  SalesShipmentListFilters,
  SalesShipmentListRow,
} from '../types/sales.types';

export class SalesRepository {
  constructor(private readonly executor: Queryable) {}

  async createCustomer(
    customer: Omit<Customer, 'created_at' | 'updated_at' | 'deleted_at'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO customers
      (
        id, tenant_id, name, code, email, phone, contact_person, tax_number,
        address_line_1, address_line_2, city, state, postal_code, country,
        status, notes, created_by, updated_by, deleted_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      customer.id,
      customer.tenant_id,
      customer.name,
      customer.code,
      customer.email,
      customer.phone,
      customer.contact_person,
      customer.tax_number,
      customer.address_line_1,
      customer.address_line_2,
      customer.city,
      customer.state,
      customer.postal_code,
      customer.country,
      customer.status,
      customer.notes,
      customer.created_by,
      customer.updated_by,
      customer.deleted_by,
    ]);
  }

  async updateCustomer(
    tenantId: string,
    customerId: string,
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
      status: string;
      notes: string | null;
      updated_by: string;
    },
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE customers
      SET
        name = ?, code = ?, email = ?, phone = ?, contact_person = ?, tax_number = ?,
        address_line_1 = ?, address_line_2 = ?, city = ?, state = ?, postal_code = ?, country = ?,
        status = ?, notes = ?, updated_by = ?, updated_at = NOW()
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
      payload.status,
      payload.notes,
      payload.updated_by,
      tenantId,
      customerId,
    ]);
  }

  async softDeleteCustomer(
    tenantId: string,
    customerId: string,
    actorUserId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE customers
      SET deleted_at = NOW(), deleted_by = ?, updated_by = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [actorUserId, actorUserId, tenantId, customerId]);
  }

  async findCustomerById(
    tenantId: string,
    customerId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<Customer | null> {
    const sql = `
      SELECT *
      FROM customers
      WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, customerId]);
    return (rows as Customer[])[0] ?? null;
  }

  async findCustomerByCode(
    tenantId: string,
    code: string,
    excludeCustomerId?: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<Customer | null> {
    const params: string[] = [tenantId, code];
    let sql = `
      SELECT *
      FROM customers
      WHERE tenant_id = ? AND code = ? AND deleted_at IS NULL
    `;
    if (excludeCustomerId) {
      sql += ' AND id <> ?';
      params.push(excludeCustomerId);
    }
    sql += ' LIMIT 1';
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, params);
    return (rows as Customer[])[0] ?? null;
  }

  async listCustomers(tenantId: string, filters: CustomerListFilters): Promise<Customer[]> {
    const params: Array<string | number> = [tenantId];
    const where = ['tenant_id = ?', 'deleted_at IS NULL'];
    if (filters.search) {
      where.push(
        '(name LIKE ? OR code LIKE ? OR email LIKE ? OR contact_person LIKE ? OR phone LIKE ? OR city LIKE ? OR country LIKE ?)'
      );
      const search = `%${filters.search}%`;
      params.push(search, search, search, search, search, search, search);
    }
    if (filters.status) {
      where.push('status = ?');
      params.push(filters.status);
    }
    const limit = Number(filters.limit);
    const offset = (Number(filters.page) - 1) * limit;
    const sql = `
      SELECT *
      FROM customers
      WHERE ${where.join(' AND ')}
      ORDER BY ${filters.sortBy} ${filters.sortDir}, id ${filters.sortDir}
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, params);
    return rows as Customer[];
  }

  async countCustomers(tenantId: string, filters: CustomerListFilters): Promise<number> {
    const params: Array<string | number> = [tenantId];
    const where = ['tenant_id = ?', 'deleted_at IS NULL'];
    if (filters.search) {
      where.push(
        '(name LIKE ? OR code LIKE ? OR email LIKE ? OR contact_person LIKE ? OR phone LIKE ? OR city LIKE ? OR country LIKE ?)'
      );
      const search = `%${filters.search}%`;
      params.push(search, search, search, search, search, search, search);
    }
    if (filters.status) {
      where.push('status = ?');
      params.push(filters.status);
    }
    const sql = `SELECT COUNT(*) AS total FROM customers WHERE ${where.join(' AND ')}`;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async countActiveOrdersForCustomer(
    tenantId: string,
    customerId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<number> {
    const sql = `
      SELECT COUNT(*) AS total
      FROM sales_orders
      WHERE tenant_id = ? AND customer_id = ? AND deleted_at IS NULL AND status <> 'CANCELLED'
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, customerId]);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async createSalesOrder(
    order: Omit<SalesOrder, 'created_at' | 'updated_at' | 'deleted_at'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO sales_orders
      (
        id, tenant_id, customer_id, customer_name, warehouse_id, sales_order_number, status,
        order_date, expected_ship_date, currency_code, payment_type, payment_status, payment_mode,
        subtotal_amount, tax_amount, discount_amount, total_amount, notes, created_by, updated_by,
        deleted_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      order.id,
      order.tenant_id,
      order.customer_id,
      order.customer_name,
      order.warehouse_id,
      order.sales_order_number,
      order.status,
      order.order_date,
      order.expected_ship_date,
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

  async updateSalesOrder(
    tenantId: string,
    salesOrderId: string,
    payload: {
      customer_id: string | null;
      customer_name: string;
      warehouse_id: string;
      order_date: Date;
      expected_ship_date: Date | null;
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
      UPDATE sales_orders
      SET
        customer_id = ?, customer_name = ?, warehouse_id = ?, order_date = ?, expected_ship_date = ?,
        currency_code = ?, payment_type = ?, payment_status = ?, payment_mode = ?, subtotal_amount = ?,
        tax_amount = ?, discount_amount = ?, total_amount = ?, notes = ?, updated_by = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.customer_id,
      payload.customer_name,
      payload.warehouse_id,
      payload.order_date,
      payload.expected_ship_date,
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
      salesOrderId,
    ]);
  }

  async updateSalesOrderStatus(
    tenantId: string,
    salesOrderId: string,
    payload: { status: string; updatedBy: string },
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE sales_orders
      SET status = ?, updated_by = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [payload.status, payload.updatedBy, tenantId, salesOrderId]);
  }

  async findSalesOrderById(
    tenantId: string,
    salesOrderId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<SalesOrder | null> {
    const sql = `
      SELECT *
      FROM sales_orders
      WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, salesOrderId]);
    return (rows as SalesOrder[])[0] ?? null;
  }

  async findSalesOrderByIdForUpdate(
    tenantId: string,
    salesOrderId: string,
    executor: Queryable | DatabaseTransaction
  ): Promise<SalesOrder | null> {
    const sql = `
      SELECT *
      FROM sales_orders
      WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL
      LIMIT 1
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [tenantId, salesOrderId]);
    return (rows as SalesOrder[])[0] ?? null;
  }

  async findSalesOrderDetailById(
    tenantId: string,
    salesOrderId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<SalesOrderListRow | null> {
    const sql = `
      SELECT
        so.*,
        w.name AS warehouse_name
      FROM sales_orders so
      INNER JOIN warehouses w ON w.id = so.warehouse_id AND w.tenant_id = so.tenant_id AND w.deleted_at IS NULL
      WHERE so.tenant_id = ? AND so.id = ? AND so.deleted_at IS NULL
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, salesOrderId]);
    return (rows as SalesOrderListRow[])[0] ?? null;
  }

  async listSalesOrders(tenantId: string, filters: SalesOrderListFilters): Promise<SalesOrderListRow[]> {
    const params: Array<string | number> = [tenantId];
    const where = ['so.tenant_id = ?', 'so.deleted_at IS NULL'];
    if (filters.search) {
      where.push('(so.sales_order_number LIKE ? OR so.customer_name LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search);
    }
    if (filters.status) {
      where.push('so.status = ?');
      params.push(filters.status);
    }
    if (filters.customerId) {
      where.push('so.customer_id = ?');
      params.push(filters.customerId);
    }
    if (filters.warehouseId) {
      where.push('so.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    const limit = Number(filters.limit);
    const offset = (Number(filters.page) - 1) * limit;
    const sortColumnMap: Record<SalesOrderListFilters['sortBy'], string> = {
      created_at: 'so.created_at',
      updated_at: 'so.updated_at',
      sales_order_number: 'so.sales_order_number',
      order_date: 'so.order_date',
      customer_name: 'so.customer_name',
      status: 'so.status',
    };
    const sortColumn = sortColumnMap[filters.sortBy];
    const sql = `
      SELECT
        so.*,
        w.name AS warehouse_name
      FROM sales_orders so
      INNER JOIN warehouses w ON w.id = so.warehouse_id AND w.tenant_id = so.tenant_id AND w.deleted_at IS NULL
      WHERE ${where.join(' AND ')}
      ORDER BY ${sortColumn} ${filters.sortDir}, so.id ${filters.sortDir}
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, params);
    return rows as SalesOrderListRow[];
  }

  async countSalesOrders(tenantId: string, filters: SalesOrderListFilters): Promise<number> {
    const params: Array<string | number> = [tenantId];
    const where = ['so.tenant_id = ?', 'so.deleted_at IS NULL'];
    if (filters.search) {
      where.push('(so.sales_order_number LIKE ? OR so.customer_name LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search);
    }
    if (filters.status) {
      where.push('so.status = ?');
      params.push(filters.status);
    }
    if (filters.customerId) {
      where.push('so.customer_id = ?');
      params.push(filters.customerId);
    }
    if (filters.warehouseId) {
      where.push('so.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    const sql = `
      SELECT COUNT(*) AS total
      FROM sales_orders so
      WHERE ${where.join(' AND ')}
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async createSalesOrderItem(
    item: SalesOrderItem,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO sales_order_items
      (
        id, tenant_id, sales_order_id, product_id, product_variant_id,
        ordered_quantity, reserved_quantity, shipped_quantity, unit_price,
        tax_amount, discount_amount, line_total, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      item.id,
      item.tenant_id,
      item.sales_order_id,
      item.product_id,
      item.product_variant_id,
      item.ordered_quantity,
      item.reserved_quantity,
      item.shipped_quantity,
      item.unit_price,
      item.tax_amount,
      item.discount_amount,
      item.line_total,
      item.notes,
    ]);
  }

  async deleteSalesOrderItems(
    tenantId: string,
    salesOrderId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `DELETE FROM sales_order_items WHERE tenant_id = ? AND sales_order_id = ?`;
    await executor.execute<mysql.ResultSetHeader>(sql, [tenantId, salesOrderId]);
  }

  async listSalesOrderItems(
    tenantId: string,
    salesOrderId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<SalesOrderItemDetailRow[]> {
    const sql = `
      SELECT
        soi.*,
        p.name AS product_name,
        pv.name AS variant_name,
        p.product_type,
        COALESCE(pv.sku, p.sku) AS sku
      FROM sales_order_items soi
      LEFT JOIN products p ON p.id = soi.product_id AND p.tenant_id = soi.tenant_id AND p.deleted_at IS NULL
      LEFT JOIN product_variants pv ON pv.id = soi.product_variant_id AND pv.tenant_id = soi.tenant_id AND pv.deleted_at IS NULL
      WHERE soi.tenant_id = ? AND soi.sales_order_id = ?
      ORDER BY soi.created_at ASC, soi.id ASC
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, salesOrderId]);
    return rows as SalesOrderItemDetailRow[];
  }

  async listSalesOrderItemsForUpdate(
    tenantId: string,
    salesOrderId: string,
    executor: Queryable | DatabaseTransaction
  ): Promise<SalesOrderItem[]> {
    const sql = `
      SELECT *
      FROM sales_order_items
      WHERE tenant_id = ? AND sales_order_id = ?
      ORDER BY created_at ASC, id ASC
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [tenantId, salesOrderId]);
    return rows as SalesOrderItem[];
  }

  async findSalesOrderItemByIdForUpdate(
    tenantId: string,
    salesOrderItemId: string,
    executor: Queryable | DatabaseTransaction
  ): Promise<SalesOrderItem | null> {
    const sql = `
      SELECT *
      FROM sales_order_items
      WHERE tenant_id = ? AND id = ?
      LIMIT 1
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [tenantId, salesOrderItemId]);
    return (rows as SalesOrderItem[])[0] ?? null;
  }

  async updateSalesOrderItemQuantities(
    tenantId: string,
    salesOrderItemId: string,
    payload: { reservedQuantity: string; shippedQuantity: string },
    executor: Queryable | DatabaseTransaction
  ) {
    const sql = `
      UPDATE sales_order_items
      SET reserved_quantity = ?, shipped_quantity = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.reservedQuantity,
      payload.shippedQuantity,
      tenantId,
      salesOrderItemId,
    ]);
  }

  async createSalesReservation(
    reservation: Omit<SalesReservation, 'created_at' | 'updated_at'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO sales_reservations
      (
        id, tenant_id, sales_order_id, warehouse_id, reservation_number,
        reservation_date, status, notes, created_by, updated_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      reservation.id,
      reservation.tenant_id,
      reservation.sales_order_id,
      reservation.warehouse_id,
      reservation.reservation_number,
      reservation.reservation_date,
      reservation.status,
      reservation.notes,
      reservation.created_by,
      reservation.updated_by,
    ]);
  }

  async createSalesReservationItem(
    item: SalesReservationItem,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO sales_reservation_items
      (
        id, tenant_id, sales_reservation_id, sales_order_item_id, product_id,
        product_variant_id, bin_id, reserved_quantity, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      item.id,
      item.tenant_id,
      item.sales_reservation_id,
      item.sales_order_item_id,
      item.product_id,
      item.product_variant_id,
      item.bin_id,
      item.reserved_quantity,
    ]);
  }

  async findSalesReservationById(
    tenantId: string,
    reservationId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<SalesReservation | null> {
    const sql = `
      SELECT *
      FROM sales_reservations
      WHERE tenant_id = ? AND id = ?
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, reservationId]);
    return (rows as SalesReservation[])[0] ?? null;
  }

  async findSalesReservationByIdForUpdate(
    tenantId: string,
    reservationId: string,
    executor: Queryable | DatabaseTransaction
  ): Promise<SalesReservation | null> {
    const sql = `
      SELECT *
      FROM sales_reservations
      WHERE tenant_id = ? AND id = ?
      LIMIT 1
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [tenantId, reservationId]);
    return (rows as SalesReservation[])[0] ?? null;
  }

  async findSalesReservationDetailById(
    tenantId: string,
    reservationId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<SalesReservationListRow | null> {
    const sql = `
      SELECT
        sr.*,
        so.sales_order_number,
        w.name AS warehouse_name
      FROM sales_reservations sr
      INNER JOIN sales_orders so ON so.id = sr.sales_order_id AND so.tenant_id = sr.tenant_id AND so.deleted_at IS NULL
      INNER JOIN warehouses w ON w.id = sr.warehouse_id AND w.tenant_id = sr.tenant_id AND w.deleted_at IS NULL
      WHERE sr.tenant_id = ? AND sr.id = ?
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, reservationId]);
    return (rows as SalesReservationListRow[])[0] ?? null;
  }

  async listSalesReservations(
    tenantId: string,
    filters: SalesReservationListFilters
  ): Promise<SalesReservationListRow[]> {
    const params: Array<string | number> = [tenantId];
    const where = ['sr.tenant_id = ?'];
    if (filters.search) {
      where.push('(sr.reservation_number LIKE ? OR so.sales_order_number LIKE ? OR w.name LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search, search);
    }
    if (filters.status) {
      where.push('sr.status = ?');
      params.push(filters.status);
    }
    if (filters.salesOrderId) {
      where.push('sr.sales_order_id = ?');
      params.push(filters.salesOrderId);
    }
    if (filters.warehouseId) {
      where.push('sr.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    const limit = Number(filters.limit);
    const offset = (Number(filters.page) - 1) * limit;
    const sortColumnMap: Record<SalesReservationListFilters['sortBy'], string> = {
      created_at: 'sr.created_at',
      updated_at: 'sr.updated_at',
      reservation_number: 'sr.reservation_number',
      reservation_date: 'sr.reservation_date',
      sales_order_number: 'so.sales_order_number',
      warehouse_name: 'w.name',
      status: 'sr.status',
    };
    const sortColumn = sortColumnMap[filters.sortBy];
    const sql = `
      SELECT
        sr.*,
        so.sales_order_number,
        w.name AS warehouse_name
      FROM sales_reservations sr
      INNER JOIN sales_orders so ON so.id = sr.sales_order_id AND so.tenant_id = sr.tenant_id AND so.deleted_at IS NULL
      INNER JOIN warehouses w ON w.id = sr.warehouse_id AND w.tenant_id = sr.tenant_id AND w.deleted_at IS NULL
      WHERE ${where.join(' AND ')}
      ORDER BY ${sortColumn} ${filters.sortDir}, sr.id ${filters.sortDir}
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, params);
    return rows as SalesReservationListRow[];
  }

  async countSalesReservations(tenantId: string, filters: SalesReservationListFilters): Promise<number> {
    const params: Array<string | number> = [tenantId];
    const where = ['sr.tenant_id = ?'];
    let joinClause = '';
    if (filters.search) {
      joinClause = `
        INNER JOIN sales_orders so ON so.id = sr.sales_order_id AND so.tenant_id = sr.tenant_id AND so.deleted_at IS NULL
        INNER JOIN warehouses w ON w.id = sr.warehouse_id AND w.tenant_id = sr.tenant_id AND w.deleted_at IS NULL
      `;
      where.push('(sr.reservation_number LIKE ? OR so.sales_order_number LIKE ? OR w.name LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search, search);
    }
    if (filters.status) {
      where.push('sr.status = ?');
      params.push(filters.status);
    }
    if (filters.salesOrderId) {
      where.push('sr.sales_order_id = ?');
      params.push(filters.salesOrderId);
    }
    if (filters.warehouseId) {
      where.push('sr.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    const sql = `
      SELECT COUNT(*) AS total
      FROM sales_reservations sr
      ${joinClause}
      WHERE ${where.join(' AND ')}
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async listSalesReservationItems(
    tenantId: string,
    reservationId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<SalesReservationItemDetailRow[]> {
    const sql = `
      SELECT
        sri.*,
        p.name AS product_name,
        pv.name AS variant_name,
        p.product_type,
        COALESCE(pv.sku, p.sku) AS sku,
        wb.name AS bin_name
      FROM sales_reservation_items sri
      LEFT JOIN products p ON p.id = sri.product_id AND p.tenant_id = sri.tenant_id AND p.deleted_at IS NULL
      LEFT JOIN product_variants pv ON pv.id = sri.product_variant_id AND pv.tenant_id = sri.tenant_id AND pv.deleted_at IS NULL
      LEFT JOIN warehouse_bins wb ON wb.id = sri.bin_id AND wb.tenant_id = sri.tenant_id AND wb.deleted_at IS NULL
      WHERE sri.tenant_id = ? AND sri.sales_reservation_id = ?
      ORDER BY sri.created_at ASC, sri.id ASC
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, reservationId]);
    return rows as SalesReservationItemDetailRow[];
  }

  async updateSalesReservationStatus(
    tenantId: string,
    reservationId: string,
    payload: { status: string; updatedBy: string },
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE sales_reservations
      SET status = ?, updated_by = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.status,
      payload.updatedBy,
      tenantId,
      reservationId,
    ]);
  }

  async createSalesShipment(
    shipment: Omit<SalesShipment, 'created_at' | 'updated_at'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO sales_shipments
      (
        id, tenant_id, sales_order_id, warehouse_id, shipment_number,
        shipment_date, status, notes, created_by, updated_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      shipment.id,
      shipment.tenant_id,
      shipment.sales_order_id,
      shipment.warehouse_id,
      shipment.shipment_number,
      shipment.shipment_date,
      shipment.status,
      shipment.notes,
      shipment.created_by,
      shipment.updated_by,
    ]);
  }

  async createSalesShipmentItem(
    item: SalesShipmentItem,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO sales_shipment_items
      (
        id, tenant_id, sales_shipment_id, sales_order_item_id, product_id,
        product_variant_id, bin_id, shipped_quantity, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      item.id,
      item.tenant_id,
      item.sales_shipment_id,
      item.sales_order_item_id,
      item.product_id,
      item.product_variant_id,
      item.bin_id,
      item.shipped_quantity,
    ]);
  }

  async findSalesShipmentById(
    tenantId: string,
    shipmentId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<SalesShipment | null> {
    const sql = `
      SELECT *
      FROM sales_shipments
      WHERE tenant_id = ? AND id = ?
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, shipmentId]);
    return (rows as SalesShipment[])[0] ?? null;
  }

  async findSalesShipmentByIdForUpdate(
    tenantId: string,
    shipmentId: string,
    executor: Queryable | DatabaseTransaction
  ): Promise<SalesShipment | null> {
    const sql = `
      SELECT *
      FROM sales_shipments
      WHERE tenant_id = ? AND id = ?
      LIMIT 1
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [tenantId, shipmentId]);
    return (rows as SalesShipment[])[0] ?? null;
  }

  async findSalesShipmentDetailById(
    tenantId: string,
    shipmentId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<SalesShipmentListRow | null> {
    const sql = `
      SELECT
        ss.*,
        so.sales_order_number,
        w.name AS warehouse_name
      FROM sales_shipments ss
      INNER JOIN sales_orders so ON so.id = ss.sales_order_id AND so.tenant_id = ss.tenant_id AND so.deleted_at IS NULL
      INNER JOIN warehouses w ON w.id = ss.warehouse_id AND w.tenant_id = ss.tenant_id AND w.deleted_at IS NULL
      WHERE ss.tenant_id = ? AND ss.id = ?
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, shipmentId]);
    return (rows as SalesShipmentListRow[])[0] ?? null;
  }

  async listSalesShipments(tenantId: string, filters: SalesShipmentListFilters): Promise<SalesShipmentListRow[]> {
    const params: Array<string | number> = [tenantId];
    const where = ['ss.tenant_id = ?'];
    if (filters.search) {
      where.push('(ss.shipment_number LIKE ? OR so.sales_order_number LIKE ? OR w.name LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search, search);
    }
    if (filters.status) {
      where.push('ss.status = ?');
      params.push(filters.status);
    }
    if (filters.salesOrderId) {
      where.push('ss.sales_order_id = ?');
      params.push(filters.salesOrderId);
    }
    if (filters.warehouseId) {
      where.push('ss.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    const limit = Number(filters.limit);
    const offset = (Number(filters.page) - 1) * limit;
    const sortColumnMap: Record<SalesShipmentListFilters['sortBy'], string> = {
      created_at: 'ss.created_at',
      updated_at: 'ss.updated_at',
      shipment_number: 'ss.shipment_number',
      shipment_date: 'ss.shipment_date',
      sales_order_number: 'so.sales_order_number',
      warehouse_name: 'w.name',
      status: 'ss.status',
    };
    const sortColumn = sortColumnMap[filters.sortBy];
    const sql = `
      SELECT
        ss.*,
        so.sales_order_number,
        w.name AS warehouse_name
      FROM sales_shipments ss
      INNER JOIN sales_orders so ON so.id = ss.sales_order_id AND so.tenant_id = ss.tenant_id AND so.deleted_at IS NULL
      INNER JOIN warehouses w ON w.id = ss.warehouse_id AND w.tenant_id = ss.tenant_id AND w.deleted_at IS NULL
      WHERE ${where.join(' AND ')}
      ORDER BY ${sortColumn} ${filters.sortDir}, ss.id ${filters.sortDir}
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, params);
    return rows as SalesShipmentListRow[];
  }

  async countSalesShipments(tenantId: string, filters: SalesShipmentListFilters): Promise<number> {
    const params: Array<string | number> = [tenantId];
    const where = ['ss.tenant_id = ?'];
    let joinClause = '';
    if (filters.search) {
      joinClause = `
        INNER JOIN sales_orders so ON so.id = ss.sales_order_id AND so.tenant_id = ss.tenant_id AND so.deleted_at IS NULL
        INNER JOIN warehouses w ON w.id = ss.warehouse_id AND w.tenant_id = ss.tenant_id AND w.deleted_at IS NULL
      `;
      where.push('(ss.shipment_number LIKE ? OR so.sales_order_number LIKE ? OR w.name LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search, search);
    }
    if (filters.status) {
      where.push('ss.status = ?');
      params.push(filters.status);
    }
    if (filters.salesOrderId) {
      where.push('ss.sales_order_id = ?');
      params.push(filters.salesOrderId);
    }
    if (filters.warehouseId) {
      where.push('ss.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    const sql = `
      SELECT COUNT(*) AS total
      FROM sales_shipments ss
      ${joinClause}
      WHERE ${where.join(' AND ')}
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async listSalesShipmentItems(
    tenantId: string,
    shipmentId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<SalesShipmentItemDetailRow[]> {
    const sql = `
      SELECT
        ssi.*,
        p.name AS product_name,
        pv.name AS variant_name,
        p.product_type,
        COALESCE(pv.sku, p.sku) AS sku,
        wb.name AS bin_name
      FROM sales_shipment_items ssi
      LEFT JOIN products p ON p.id = ssi.product_id AND p.tenant_id = ssi.tenant_id AND p.deleted_at IS NULL
      LEFT JOIN product_variants pv ON pv.id = ssi.product_variant_id AND pv.tenant_id = ssi.tenant_id AND pv.deleted_at IS NULL
      LEFT JOIN warehouse_bins wb ON wb.id = ssi.bin_id AND wb.tenant_id = ssi.tenant_id AND wb.deleted_at IS NULL
      WHERE ssi.tenant_id = ? AND ssi.sales_shipment_id = ?
      ORDER BY ssi.created_at ASC, ssi.id ASC
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, shipmentId]);
    return rows as SalesShipmentItemDetailRow[];
  }

  async updateSalesShipmentStatus(
    tenantId: string,
    shipmentId: string,
    payload: { status: string; updatedBy: string },
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE sales_shipments
      SET status = ?, updated_by = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [payload.status, payload.updatedBy, tenantId, shipmentId]);
  }

  async findSalesItemReference(
    tenantId: string,
    input: { productId?: string | null; productVariantId?: string | null },
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<SalesItemReference | null> {
    type RawSalesItemReference = {
      productId: string | null;
      productVariantId: string | null;
      productType: string;
      productStatus: string;
      isSellable: number;
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
          p.is_sellable AS isSellable,
          p.track_inventory AS trackInventory,
          p.name AS productName,
          NULL AS variantName,
          p.sku AS sku
        FROM products p
        WHERE p.id = ? AND p.tenant_id = ? AND p.deleted_at IS NULL
        LIMIT 1
      `;
      const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [input.productId, tenantId]);
      const row = rows[0] as unknown as RawSalesItemReference | undefined;
      return row
        ? {
            productId: row.productId,
            productVariantId: row.productVariantId,
            productType: row.productType,
            productStatus: row.productStatus,
            isSellable: Boolean(row.isSellable),
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
          p.is_sellable AS isSellable,
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
      const row = rows[0] as unknown as RawSalesItemReference | undefined;
      return row
        ? {
            productId: row.productId,
            productVariantId: row.productVariantId,
            productType: row.productType,
            productStatus: row.productStatus,
            isSellable: Boolean(row.isSellable),
            trackInventory: Boolean(row.trackInventory),
            productName: row.productName,
            variantName: row.variantName,
            sku: row.sku,
          }
        : null;
    }

    return null;
  }
}
