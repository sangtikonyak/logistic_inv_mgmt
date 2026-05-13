import mysql from 'mysql2/promise';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import {
  Warehouse,
  WarehouseBin,
  WarehouseListFilters,
  WarehouseZone,
  WarehousePicklist,
  WarehousePicklistItem,
  WarehousePutawayTask,
  WarehousePutawayTaskItem,
} from '../types/warehouse.types';

export class WarehouseRepository {
  constructor(private readonly executor: Queryable) {}

  async createWarehouse(
    warehouse: Omit<Warehouse, 'created_at' | 'updated_at' | 'deleted_at'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO warehouses
      (
        id, tenant_id, name, code, status, is_default,
        address_line_1, address_line_2, city, state, postal_code, country,
        latitude, longitude, created_by, updated_by, deleted_by,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      warehouse.id,
      warehouse.tenant_id,
      warehouse.name,
      warehouse.code,
      warehouse.status,
      warehouse.is_default,
      warehouse.address_line_1,
      warehouse.address_line_2,
      warehouse.city,
      warehouse.state,
      warehouse.postal_code,
      warehouse.country,
      warehouse.latitude,
      warehouse.longitude,
      warehouse.created_by,
      warehouse.updated_by,
      warehouse.deleted_by,
    ]);
  }

  async updateWarehouse(
    tenantId: string,
    warehouseId: string,
    payload: {
      name: string;
      code: string;
      status: string;
      is_default: number;
      address_line_1: string | null;
      address_line_2: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
      latitude: string | null;
      longitude: string | null;
      updated_by: string;
    },
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE warehouses
      SET
        name = ?,
        code = ?,
        status = ?,
        is_default = ?,
        address_line_1 = ?,
        address_line_2 = ?,
        city = ?,
        state = ?,
        postal_code = ?,
        country = ?,
        latitude = ?,
        longitude = ?,
        updated_by = ?,
        updated_at = NOW()
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.name,
      payload.code,
      payload.status,
      payload.is_default,
      payload.address_line_1,
      payload.address_line_2,
      payload.city,
      payload.state,
      payload.postal_code,
      payload.country,
      payload.latitude,
      payload.longitude,
      payload.updated_by,
      warehouseId,
      tenantId,
    ]);
  }

  async softDeleteWarehouse(
    tenantId: string,
    warehouseId: string,
    actorUserId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE warehouses
      SET deleted_at = NOW(), deleted_by = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [actorUserId, actorUserId, warehouseId, tenantId]);
  }

  async findWarehouseById(
    tenantId: string,
    warehouseId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<Warehouse | null> {
    const sql = `
      SELECT *
      FROM warehouses
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [warehouseId, tenantId]);
    return (rows as Warehouse[])[0] ?? null;
  }

  async findWarehouseByIdForUpdate(
    tenantId: string,
    warehouseId: string,
    executor: Queryable | DatabaseTransaction
  ): Promise<Warehouse | null> {
    const sql = `
      SELECT *
      FROM warehouses
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
      LIMIT 1
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [warehouseId, tenantId]);
    return (rows as Warehouse[])[0] ?? null;
  }

  async findWarehouseByCode(
    tenantId: string,
    code: string,
    excludeWarehouseId?: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<Warehouse | null> {
    const params: string[] = [tenantId, code];
    let sql = `
      SELECT *
      FROM warehouses
      WHERE tenant_id = ? AND code = ? AND deleted_at IS NULL
    `;
    if (excludeWarehouseId) {
      sql += ' AND id <> ?';
      params.push(excludeWarehouseId);
    }
    sql += ' LIMIT 1';
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, params);
    return (rows as Warehouse[])[0] ?? null;
  }

  async listWarehouses(tenantId: string, filters: WarehouseListFilters): Promise<Warehouse[]> {
    const params: Array<string | number> = [tenantId];
    const where: string[] = ['tenant_id = ?', 'deleted_at IS NULL'];

    if (filters.search) {
      where.push('(name LIKE ? OR code LIKE ? OR city LIKE ? OR country LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search, search, search);
    }
    if (filters.status) {
      where.push('status = ?');
      params.push(filters.status);
    }
    if (typeof filters.isDefault === 'boolean') {
      where.push('is_default = ?');
      params.push(filters.isDefault ? 1 : 0);
    }

    const limit = Number(filters.limit);
    const offset = (Number(filters.page) - 1) * limit;
    const sql = `
      SELECT *
      FROM warehouses
      WHERE ${where.join(' AND ')}
      ORDER BY ${filters.sortBy} ${filters.sortDir}, id ${filters.sortDir}
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, params);
    return rows as Warehouse[];
  }

  async countWarehouses(tenantId: string, filters: WarehouseListFilters): Promise<number> {
    const params: Array<string | number> = [tenantId];
    const where: string[] = ['tenant_id = ?', 'deleted_at IS NULL'];

    if (filters.search) {
      where.push('(name LIKE ? OR code LIKE ? OR city LIKE ? OR country LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search, search, search);
    }
    if (filters.status) {
      where.push('status = ?');
      params.push(filters.status);
    }
    if (typeof filters.isDefault === 'boolean') {
      where.push('is_default = ?');
      params.push(filters.isDefault ? 1 : 0);
    }

    const sql = `
      SELECT COUNT(*) AS total
      FROM warehouses
      WHERE ${where.join(' AND ')}
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async clearDefaultWarehouse(tenantId: string, executor: Queryable | DatabaseTransaction = this.executor) {
    const sql = `
      UPDATE warehouses
      SET is_default = FALSE, updated_at = NOW()
      WHERE tenant_id = ? AND deleted_at IS NULL AND is_default = TRUE
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [tenantId]);
  }

  async setDefaultWarehouse(
    tenantId: string,
    warehouseId: string,
    actorUserId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE warehouses
      SET is_default = TRUE, updated_by = ?, updated_at = NOW()
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [actorUserId, warehouseId, tenantId]);
  }

  async countActiveWarehouses(
    tenantId: string,
    excludeWarehouseId?: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const params: string[] = [tenantId];
    let sql = `
      SELECT COUNT(*) AS total
      FROM warehouses
      WHERE tenant_id = ? AND deleted_at IS NULL
    `;
    if (excludeWarehouseId) {
      sql += ' AND id <> ?';
      params.push(excludeWarehouseId);
    }
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, params);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async createZone(
    zone: Omit<WarehouseZone, 'created_at' | 'updated_at' | 'deleted_at'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO warehouse_zones
      (
        id, tenant_id, warehouse_id, name, code, sort_order,
        created_by, updated_by, deleted_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      zone.id,
      zone.tenant_id,
      zone.warehouse_id,
      zone.name,
      zone.code,
      zone.sort_order,
      zone.created_by,
      zone.updated_by,
      zone.deleted_by,
    ]);
  }

  async listZonesByWarehouse(tenantId: string, warehouseId: string): Promise<WarehouseZone[]> {
    const sql = `
      SELECT *
      FROM warehouse_zones
      WHERE tenant_id = ? AND warehouse_id = ? AND deleted_at IS NULL
      ORDER BY sort_order ASC, name ASC, id ASC
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, warehouseId]);
    return rows as WarehouseZone[];
  }

  async listBinsByWarehouse(tenantId: string, warehouseId: string): Promise<WarehouseBin[]> {
    const sql = `
      SELECT *
      FROM warehouse_bins
      WHERE tenant_id = ? AND warehouse_id = ? AND deleted_at IS NULL
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, warehouseId]);
    return rows as WarehouseBin[];
  }

  async findZoneById(
    tenantId: string,
    zoneId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<WarehouseZone | null> {
    const sql = `
      SELECT *
      FROM warehouse_zones
      WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, zoneId]);
    return (rows as WarehouseZone[])[0] ?? null;
  }

  async findZoneByCode(
    tenantId: string,
    warehouseId: string,
    code: string,
    excludeZoneId?: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<WarehouseZone | null> {
    const params: string[] = [tenantId, warehouseId, code];
    let sql = `
      SELECT *
      FROM warehouse_zones
      WHERE tenant_id = ? AND warehouse_id = ? AND code = ? AND deleted_at IS NULL
    `;
    if (excludeZoneId) {
      sql += ' AND id <> ?';
      params.push(excludeZoneId);
    }
    sql += ' LIMIT 1';
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, params);
    return (rows as WarehouseZone[])[0] ?? null;
  }

  async updateZone(
    tenantId: string,
    zoneId: string,
    payload: { name: string; code: string; sort_order: number; updated_by: string },
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE warehouse_zones
      SET name = ?, code = ?, sort_order = ?, updated_by = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.name,
      payload.code,
      payload.sort_order,
      payload.updated_by,
      tenantId,
      zoneId,
    ]);
  }

  async softDeleteZone(
    tenantId: string,
    zoneId: string,
    actorUserId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE warehouse_zones
      SET deleted_at = NOW(), deleted_by = ?, updated_by = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [actorUserId, actorUserId, tenantId, zoneId]);
  }

  async createBin(
    bin: Omit<WarehouseBin, 'created_at' | 'updated_at' | 'deleted_at'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      INSERT INTO warehouse_bins
      (
        id, tenant_id, warehouse_id, zone_id, name, code, sort_order,
        is_pickable, is_receiving, is_dispatch,
        created_by, updated_by, deleted_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      bin.id,
      bin.tenant_id,
      bin.warehouse_id,
      bin.zone_id,
      bin.name,
      bin.code,
      bin.sort_order,
      bin.is_pickable,
      bin.is_receiving,
      bin.is_dispatch,
      bin.created_by,
      bin.updated_by,
      bin.deleted_by,
    ]);
  }

  async listBinsByZone(tenantId: string, zoneId: string): Promise<WarehouseBin[]> {
    const sql = `
      SELECT *
      FROM warehouse_bins
      WHERE tenant_id = ? AND zone_id = ? AND deleted_at IS NULL
      ORDER BY sort_order ASC, name ASC, id ASC
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, zoneId]);
    return rows as WarehouseBin[];
  }

  async findBinById(
    tenantId: string,
    binId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<WarehouseBin | null> {
    const sql = `
      SELECT *
      FROM warehouse_bins
      WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, binId]);
    return (rows as WarehouseBin[])[0] ?? null;
  }

  async findBinByCode(
    tenantId: string,
    warehouseId: string,
    code: string,
    excludeBinId?: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<WarehouseBin | null> {
    const params: string[] = [tenantId, warehouseId, code];
    let sql = `
      SELECT *
      FROM warehouse_bins
      WHERE tenant_id = ? AND warehouse_id = ? AND code = ? AND deleted_at IS NULL
    `;
    if (excludeBinId) {
      sql += ' AND id <> ?';
      params.push(excludeBinId);
    }
    sql += ' LIMIT 1';
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, params);
    return (rows as WarehouseBin[])[0] ?? null;
  }

  async updateBin(
    tenantId: string,
    binId: string,
    payload: {
      name: string;
      code: string;
      sort_order: number;
      is_pickable: number;
      is_receiving: number;
      is_dispatch: number;
      updated_by: string;
    },
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE warehouse_bins
      SET
        name = ?,
        code = ?,
        sort_order = ?,
        is_pickable = ?,
        is_receiving = ?,
        is_dispatch = ?,
        updated_by = ?,
        updated_at = NOW()
      WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.name,
      payload.code,
      payload.sort_order,
      payload.is_pickable,
      payload.is_receiving,
      payload.is_dispatch,
      payload.updated_by,
      tenantId,
      binId,
    ]);
  }

  async softDeleteBin(
    tenantId: string,
    binId: string,
    actorUserId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ) {
    const sql = `
      UPDATE warehouse_bins
      SET deleted_at = NOW(), deleted_by = ?, updated_by = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [actorUserId, actorUserId, tenantId, binId]);
  }

  // WMS Picklists
  async createPicklist(
    picklist: Omit<WarehousePicklist, 'created_at' | 'updated_at'>,
    executor: Queryable | DatabaseTransaction
  ) {
    const sql = `
      INSERT INTO warehouse_picklists
      (id, tenant_id, warehouse_id, picklist_number, status, assigned_to, notes, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute(sql, [
      picklist.id,
      picklist.tenant_id,
      picklist.warehouse_id,
      picklist.picklist_number,
      picklist.status,
      picklist.assigned_to,
      picklist.notes,
      picklist.created_by,
      picklist.updated_by,
    ]);
  }

  async createPicklistItem(
    item: Omit<WarehousePicklistItem, 'created_at' | 'updated_at'>,
    executor: Queryable | DatabaseTransaction
  ) {
    const sql = `
      INSERT INTO warehouse_picklist_items
      (id, tenant_id, picklist_id, reference_type, reference_id, reference_item_id, product_id, product_variant_id, zone_id, bin_id, quantity_requested, quantity_picked, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute(sql, [
      item.id,
      item.tenant_id,
      item.picklist_id,
      item.reference_type,
      item.reference_id,
      item.reference_item_id,
      item.product_id,
      item.product_variant_id,
      item.zone_id,
      item.bin_id,
      item.quantity_requested,
      item.quantity_picked,
      item.status,
    ]);
  }

  // WMS Putaway
  async createPutawayTask(
    task: Omit<WarehousePutawayTask, 'created_at' | 'updated_at'>,
    executor: Queryable | DatabaseTransaction
  ) {
    const sql = `
      INSERT INTO warehouse_putaway_tasks
      (id, tenant_id, warehouse_id, task_number, reference_type, reference_id, status, assigned_to, notes, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute(sql, [
      task.id,
      task.tenant_id,
      task.warehouse_id,
      task.task_number,
      task.reference_type,
      task.reference_id,
      task.status,
      task.assigned_to,
      task.notes,
      task.created_by,
      task.updated_by,
    ]);
  }

  async createPutawayTaskItem(
    item: Omit<WarehousePutawayTaskItem, 'created_at' | 'updated_at'>,
    executor: Queryable | DatabaseTransaction
  ) {
    const sql = `
      INSERT INTO warehouse_putaway_task_items
      (id, tenant_id, task_id, reference_item_id, product_id, product_variant_id, source_zone_id, source_bin_id, target_zone_id, target_bin_id, quantity_expected, quantity_putaway, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute(sql, [
      item.id,
      item.tenant_id,
      item.task_id,
      item.reference_item_id,
      item.product_id,
      item.product_variant_id,
      item.source_zone_id,
      item.source_bin_id,
      item.target_zone_id,
      item.target_bin_id,
      item.quantity_expected,
      item.quantity_putaway,
      item.status,
    ]);
  }

  async findPicklistById(tenantId: string, picklistId: string): Promise<WarehousePicklist | null> {
    const sql = `SELECT * FROM warehouse_picklists WHERE tenant_id = ? AND id = ?`;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, [tenantId, picklistId]);
    return (rows as WarehousePicklist[])[0] ?? null;
  }

  async findPicklistByIdForUpdate(
    tenantId: string,
    picklistId: string,
    executor: Queryable | DatabaseTransaction
  ): Promise<WarehousePicklist | null> {
    const sql = `SELECT * FROM warehouse_picklists WHERE tenant_id = ? AND id = ? FOR UPDATE`;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [tenantId, picklistId]);
    return (rows as WarehousePicklist[])[0] ?? null;
  }

  async updatePicklistStatus(
    tenantId: string,
    picklistId: string,
    payload: { status: string; assignedTo?: string | null; updatedBy: string },
    executor: Queryable | DatabaseTransaction
  ) {
    let sql = `UPDATE warehouse_picklists SET status = ?, updated_by = ?, updated_at = NOW()`;
    const params: any[] = [payload.status, payload.updatedBy];

    if (payload.assignedTo !== undefined) {
      sql += `, assigned_to = ?`;
      params.push(payload.assignedTo);
    }

    sql += ` WHERE tenant_id = ? AND id = ?`;
    params.push(tenantId, picklistId);

    await executor.execute(sql, params);
  }

  async listPicklists(
    tenantId: string,
    filters: { status?: string; assignedTo?: string; warehouseId?: string; page: number; limit: number }
  ): Promise<WarehousePicklist[]> {
    const params: any[] = [tenantId];
    const where = ['tenant_id = ?'];

    if (filters.status) {
      where.push('status = ?');
      params.push(filters.status);
    }
    if (filters.assignedTo) {
      where.push('assigned_to = ?');
      params.push(filters.assignedTo);
    }
    if (filters.warehouseId) {
      where.push('warehouse_id = ?');
      params.push(filters.warehouseId);
    }

    const limit = filters.limit;
    const offset = (filters.page - 1) * limit;

    const sql = `
      SELECT * FROM warehouse_picklists 
      WHERE ${where.join(' AND ')} 
      ORDER BY created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, params);
    return rows as WarehousePicklist[];
  }

  async countPicklists(
    tenantId: string,
    filters: { status?: string; assignedTo?: string; warehouseId?: string }
  ): Promise<number> {
    const params: any[] = [tenantId];
    const where = ['tenant_id = ?'];

    if (filters.status) {
      where.push('status = ?');
      params.push(filters.status);
    }
    if (filters.assignedTo) {
      where.push('assigned_to = ?');
      params.push(filters.assignedTo);
    }
    if (filters.warehouseId) {
      where.push('warehouse_id = ?');
      params.push(filters.warehouseId);
    }

    const sql = `SELECT COUNT(*) as total FROM warehouse_picklists WHERE ${where.join(' AND ')}`;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return Number((rows[0] as any).total);
  }

  async listPicklistItems(tenantId: string, picklistId: string, executor: Queryable | DatabaseTransaction = this.executor): Promise<WarehousePicklistItem[]> {
    const sql = `SELECT * FROM warehouse_picklist_items WHERE tenant_id = ? AND picklist_id = ?`;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [tenantId, picklistId]);
    return rows as WarehousePicklistItem[];
  }

  async findPicklistItemByIdForUpdate(
    tenantId: string,
    itemId: string,
    executor: Queryable | DatabaseTransaction
  ): Promise<WarehousePicklistItem | null> {
    const sql = `SELECT * FROM warehouse_picklist_items WHERE tenant_id = ? AND id = ? FOR UPDATE`;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [tenantId, itemId]);
    return (rows as WarehousePicklistItem[])[0] ?? null;
  }

  async updatePicklistItem(
    tenantId: string,
    itemId: string,
    payload: { quantityPicked: string; binId?: string | null; status: string },
    executor: Queryable | DatabaseTransaction
  ) {
    let sql = `UPDATE warehouse_picklist_items SET quantity_picked = ?, status = ?, updated_at = NOW()`;
    const params: any[] = [payload.quantityPicked, payload.status];

    if (payload.binId !== undefined) {
      sql += `, bin_id = ?`;
      params.push(payload.binId);
    }

    sql += ` WHERE tenant_id = ? AND id = ?`;
    params.push(tenantId, itemId);

    await executor.execute(sql, params);
  }
}
