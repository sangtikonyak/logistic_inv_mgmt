import mysql from 'mysql2/promise';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import {
  InventoryCostLayer,
  InventoryItemReference,
  InventoryLayerConsumption,
  InventoryMovement,
  InventoryMovementListRow,
  InventoryStockListRow,
  InventoryStockRow,
  MovementListFilters,
  StockListFilters,
  TransferListFilters,
  WarehouseTransfer,
  WarehouseTransferDetailRow,
  WarehouseTransferItem,
  WarehouseTransferItemDetailRow,
} from '../types/inventory.types';

interface StockLocatorInput {
  tenantId: string;
  warehouseId: string;
  binId: string | null;
  productId: string | null;
  productVariantId: string | null;
}

export class InventoryRepository {
  constructor(private readonly executor: Queryable) {}

  async countStocksInWarehouse(
    tenantId: string,
    warehouseId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<number> {
    const sql = `
      SELECT COUNT(*) AS total
      FROM inventory_stocks
      WHERE tenant_id = ? AND warehouse_id = ?
        AND (on_hand_quantity <> 0 OR reserved_quantity <> 0 OR available_quantity <> 0)
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, warehouseId]);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async countStocksInZone(
    tenantId: string,
    zoneId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<number> {
    const sql = `
      SELECT COUNT(*) AS total
      FROM inventory_stocks
      WHERE tenant_id = ? AND zone_id = ?
        AND (on_hand_quantity <> 0 OR reserved_quantity <> 0 OR available_quantity <> 0)
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, zoneId]);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async countStocksInBin(
    tenantId: string,
    binId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<number> {
    const sql = `
      SELECT COUNT(*) AS total
      FROM inventory_stocks
      WHERE tenant_id = ? AND bin_id = ?
        AND (on_hand_quantity <> 0 OR reserved_quantity <> 0 OR available_quantity <> 0)
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, binId]);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async listMovements(
    tenantId: string,
    warehouseId: string,
    filters: MovementListFilters
  ): Promise<InventoryMovementListRow[]> {
    const params: Array<string | number> = [tenantId, warehouseId];
    const where = ['m.tenant_id = ?', 'm.warehouse_id = ?'];

    if (filters.movementType) {
      where.push('m.movement_type = ?');
      params.push(filters.movementType);
    }
    if (filters.productId) {
      where.push('m.product_id = ?');
      params.push(filters.productId);
    }
    if (filters.productVariantId) {
      where.push('m.product_variant_id = ?');
      params.push(filters.productVariantId);
    }

    const limit = Number(filters.limit);
    const offset = (Number(filters.page) - 1) * limit;
    const sql = `
      SELECT
        m.*,
        w.name AS warehouse_name,
        z.name AS zone_name,
        b.name AS bin_name,
        COALESCE(p.name, pp.name) AS product_name,
        pv.name AS variant_name,
        COALESCE(p.product_type, pp.product_type) AS product_type,
        COALESCE(pv.sku, p.sku, pp.sku) AS sku
      FROM inventory_movements m
      INNER JOIN warehouses w
        ON w.id = m.warehouse_id
       AND w.tenant_id = m.tenant_id
       AND w.deleted_at IS NULL
      LEFT JOIN warehouse_zones z
        ON z.id = m.zone_id
       AND z.tenant_id = m.tenant_id
       AND z.deleted_at IS NULL
      LEFT JOIN warehouse_bins b
        ON b.id = m.bin_id
       AND b.tenant_id = m.tenant_id
       AND b.deleted_at IS NULL
      LEFT JOIN products p
        ON p.id = m.product_id
       AND p.tenant_id = m.tenant_id
       AND p.deleted_at IS NULL
      LEFT JOIN product_variants pv
        ON pv.id = m.product_variant_id
       AND pv.tenant_id = m.tenant_id
       AND pv.deleted_at IS NULL
      LEFT JOIN products pp
        ON pp.id = pv.product_id
       AND pp.tenant_id = m.tenant_id
       AND pp.deleted_at IS NULL
      WHERE ${where.join(' AND ')}
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, params);
    return rows as InventoryMovementListRow[];
  }

  async countMovements(tenantId: string, warehouseId: string, filters: MovementListFilters): Promise<number> {
    const params: Array<string | number> = [tenantId, warehouseId];
    const where = ['tenant_id = ?', 'warehouse_id = ?'];

    if (filters.movementType) {
      where.push('movement_type = ?');
      params.push(filters.movementType);
    }
    if (filters.productId) {
      where.push('product_id = ?');
      params.push(filters.productId);
    }
    if (filters.productVariantId) {
      where.push('product_variant_id = ?');
      params.push(filters.productVariantId);
    }

    const sql = `
      SELECT COUNT(*) AS total
      FROM inventory_movements
      WHERE ${where.join(' AND ')}
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async listWarehouseStock(
    tenantId: string,
    warehouseId: string,
    filters: StockListFilters
  ): Promise<InventoryStockListRow[]> {
    const stockIds = await this.listWarehouseStockPageIds(tenantId, warehouseId, filters);
    if (stockIds.length === 0) {
      return [];
    }

    return this.listWarehouseStockByIds(tenantId, warehouseId, stockIds);
  }

  async countWarehouseStock(tenantId: string, warehouseId: string, filters: StockListFilters): Promise<number> {
    const params: Array<string | number> = [tenantId, warehouseId];
    const where = ['s.tenant_id = ?', 's.warehouse_id = ?'];

    if (filters.zoneId) {
      where.push('s.zone_id = ?');
      params.push(filters.zoneId);
    }
    if (filters.binId) {
      where.push('s.bin_id = ?');
      params.push(filters.binId);
    }
    if (filters.productId) {
      where.push('s.product_id = ?');
      params.push(filters.productId);
    }
    if (filters.productVariantId) {
      where.push('s.product_variant_id = ?');
      params.push(filters.productVariantId);
    }
    if (filters.search) {
      where.push('(p.name LIKE ? OR pv.name LIKE ? OR COALESCE(pv.sku, p.sku) LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search, search);
    }

    const sql = `
      SELECT COUNT(*) AS total
      FROM inventory_stocks s
      LEFT JOIN products p
        ON p.id = s.product_id
       AND p.tenant_id = s.tenant_id
       AND p.deleted_at IS NULL
      LEFT JOIN product_variants pv
        ON pv.id = s.product_variant_id
       AND pv.tenant_id = s.tenant_id
       AND pv.deleted_at IS NULL
      LEFT JOIN products pp
        ON pp.id = pv.product_id
       AND pp.tenant_id = s.tenant_id
       AND pp.deleted_at IS NULL
      WHERE ${where.join(' AND ')}
        AND (s.product_id IS NOT NULL OR s.product_variant_id IS NOT NULL)
        AND (p.id IS NOT NULL OR pv.id IS NOT NULL)
        AND COALESCE(p.track_inventory, pp.track_inventory) = 1
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  private async listWarehouseStockPageIds(
    tenantId: string,
    warehouseId: string,
    filters: StockListFilters
  ): Promise<string[]> {
    const params: Array<string | number> = [tenantId, warehouseId];
    const where = ['s.tenant_id = ?', 's.warehouse_id = ?'];

    if (filters.zoneId) {
      where.push('s.zone_id = ?');
      params.push(filters.zoneId);
    }
    if (filters.binId) {
      where.push('s.bin_id = ?');
      params.push(filters.binId);
    }
    if (filters.productId) {
      where.push('s.product_id = ?');
      params.push(filters.productId);
    }
    if (filters.productVariantId) {
      where.push('s.product_variant_id = ?');
      params.push(filters.productVariantId);
    }
    if (filters.search) {
      where.push('(p.name LIKE ? OR pv.name LIKE ? OR COALESCE(pv.sku, p.sku) LIKE ?)');
      const search = `%${filters.search}%`;
      params.push(search, search, search);
    }

    const limit = Number(filters.limit);
    const offset = (Number(filters.page) - 1) * limit;
    const sql = `
      SELECT s.id
      FROM inventory_stocks s
      LEFT JOIN products p
        ON p.id = s.product_id
       AND p.tenant_id = s.tenant_id
       AND p.deleted_at IS NULL
      LEFT JOIN product_variants pv
        ON pv.id = s.product_variant_id
       AND pv.tenant_id = s.tenant_id
       AND pv.deleted_at IS NULL
      LEFT JOIN products pp
        ON pp.id = pv.product_id
       AND pp.tenant_id = s.tenant_id
       AND pp.deleted_at IS NULL
      WHERE ${where.join(' AND ')}
        AND (s.product_id IS NOT NULL OR s.product_variant_id IS NOT NULL)
        AND (p.id IS NOT NULL OR pv.id IS NOT NULL)
        AND COALESCE(p.track_inventory, pp.track_inventory) = 1
      ORDER BY COALESCE(p.name, pp.name) ASC, pv.name ASC, s.id ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, params);
    return rows.map((row) => String(row.id));
  }

  private async listWarehouseStockByIds(
    tenantId: string,
    warehouseId: string,
    stockIds: string[]
  ): Promise<InventoryStockListRow[]> {
    const placeholders = stockIds.map(() => '?').join(', ');
    const sql = `
      SELECT
        s.*,
        w.name AS warehouse_name,
        z.name AS zone_name,
        b.name AS bin_name,
        COALESCE(p.name, pp.name) AS product_name,
        pv.name AS variant_name,
        COALESCE(p.product_type, pp.product_type) AS product_type,
        COALESCE(pv.sku, p.sku, pp.sku) AS sku
      FROM inventory_stocks s
      INNER JOIN warehouses w
        ON w.id = s.warehouse_id
       AND w.tenant_id = s.tenant_id
       AND w.deleted_at IS NULL
      LEFT JOIN warehouse_zones z
        ON z.id = s.zone_id
       AND z.tenant_id = s.tenant_id
       AND z.deleted_at IS NULL
      LEFT JOIN warehouse_bins b
        ON b.id = s.bin_id
       AND b.tenant_id = s.tenant_id
       AND b.deleted_at IS NULL
      LEFT JOIN products p
        ON p.id = s.product_id
       AND p.tenant_id = s.tenant_id
       AND p.deleted_at IS NULL
      LEFT JOIN product_variants pv
        ON pv.id = s.product_variant_id
       AND pv.tenant_id = s.tenant_id
       AND pv.deleted_at IS NULL
      LEFT JOIN products pp
        ON pp.id = pv.product_id
       AND pp.tenant_id = s.tenant_id
       AND pp.deleted_at IS NULL
      WHERE s.tenant_id = ?
        AND s.warehouse_id = ?
        AND s.id IN (${placeholders})
      ORDER BY FIELD(s.id, ${placeholders})
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [
      tenantId,
      warehouseId,
      ...stockIds,
      ...stockIds,
    ]);
    return rows as InventoryStockListRow[];
  }

  async findWarehouseStockByItemId(
    tenantId: string,
    warehouseId: string,
    itemId: string
  ): Promise<InventoryStockListRow[]> {
    const sql = `
      SELECT
        s.*,
        w.name AS warehouse_name,
        z.name AS zone_name,
        b.name AS bin_name,
        COALESCE(p.name, pp.name) AS product_name,
        pv.name AS variant_name,
        COALESCE(p.product_type, pp.product_type) AS product_type,
        COALESCE(pv.sku, p.sku, pp.sku) AS sku
      FROM inventory_stocks s
      INNER JOIN warehouses w
        ON w.id = s.warehouse_id
       AND w.tenant_id = s.tenant_id
       AND w.deleted_at IS NULL
      LEFT JOIN warehouse_zones z
        ON z.id = s.zone_id
       AND z.tenant_id = s.tenant_id
       AND z.deleted_at IS NULL
      LEFT JOIN warehouse_bins b
        ON b.id = s.bin_id
       AND b.tenant_id = s.tenant_id
       AND b.deleted_at IS NULL
      LEFT JOIN products p
        ON p.id = s.product_id
       AND p.tenant_id = s.tenant_id
       AND p.deleted_at IS NULL
      LEFT JOIN product_variants pv
        ON pv.id = s.product_variant_id
       AND pv.tenant_id = s.tenant_id
       AND pv.deleted_at IS NULL
      LEFT JOIN products pp
        ON pp.id = pv.product_id
       AND pp.tenant_id = s.tenant_id
       AND pp.deleted_at IS NULL
      WHERE s.tenant_id = ? AND s.warehouse_id = ? AND (s.product_id = ? OR s.product_variant_id = ?)
      ORDER BY b.name ASC, s.id ASC
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, warehouseId, itemId, itemId]);
    return rows as InventoryStockListRow[];
  }

  async findWarehouseStockByStockId(
    tenantId: string,
    warehouseId: string,
    stockId: string
  ): Promise<InventoryStockListRow | null> {
    const sql = `
      SELECT
        s.*,
        w.name AS warehouse_name,
        z.name AS zone_name,
        b.name AS bin_name,
        COALESCE(p.name, pp.name) AS product_name,
        pv.name AS variant_name,
        COALESCE(p.product_type, pp.product_type) AS product_type,
        COALESCE(pv.sku, p.sku, pp.sku) AS sku
      FROM inventory_stocks s
      INNER JOIN warehouses w
        ON w.id = s.warehouse_id
       AND w.tenant_id = s.tenant_id
       AND w.deleted_at IS NULL
      LEFT JOIN warehouse_zones z
        ON z.id = s.zone_id
       AND z.tenant_id = s.tenant_id
       AND z.deleted_at IS NULL
      LEFT JOIN warehouse_bins b
        ON b.id = s.bin_id
       AND b.tenant_id = s.tenant_id
       AND b.deleted_at IS NULL
      LEFT JOIN products p
        ON p.id = s.product_id
       AND p.tenant_id = s.tenant_id
       AND p.deleted_at IS NULL
      LEFT JOIN product_variants pv
        ON pv.id = s.product_variant_id
       AND pv.tenant_id = s.tenant_id
       AND pv.deleted_at IS NULL
      LEFT JOIN products pp
        ON pp.id = pv.product_id
       AND pp.tenant_id = s.tenant_id
       AND pp.deleted_at IS NULL
      WHERE s.tenant_id = ? AND s.warehouse_id = ? AND s.id = ?
      LIMIT 1
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, warehouseId, stockId]);
    return (rows as InventoryStockListRow[])[0] ?? null;
  }

  async findStockByIdForUpdate(
    tenantId: string,
    warehouseId: string,
    stockId: string,
    executor: Queryable | DatabaseTransaction
  ): Promise<InventoryStockRow | null> {
    const sql = `
      SELECT *
      FROM inventory_stocks
      WHERE tenant_id = ? AND warehouse_id = ? AND id = ?
      LIMIT 1
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [tenantId, warehouseId, stockId]);
    return (rows as InventoryStockRow[])[0] ?? null;
  }

  async findStockByExactLocationForUpdate(
    locator: {
      tenantId: string;
      warehouseId: string;
      zoneId: string | null;
      binId: string | null;
      productId: string | null;
      productVariantId: string | null;
    },
    executor: Queryable | DatabaseTransaction
  ): Promise<InventoryStockRow | null> {
    const sql = `
      SELECT *
      FROM inventory_stocks
      WHERE tenant_id = ?
        AND warehouse_id = ?
        AND ((zone_id IS NULL AND ? IS NULL) OR zone_id = ?)
        AND ((bin_id IS NULL AND ? IS NULL) OR bin_id = ?)
        AND ((product_id IS NULL AND ? IS NULL) OR product_id = ?)
        AND ((product_variant_id IS NULL AND ? IS NULL) OR product_variant_id = ?)
      LIMIT 1
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [
      locator.tenantId,
      locator.warehouseId,
      locator.zoneId,
      locator.zoneId,
      locator.binId,
      locator.binId,
      locator.productId,
      locator.productId,
      locator.productVariantId,
      locator.productVariantId,
    ]);
    return (rows as InventoryStockRow[])[0] ?? null;
  }

  async updateStockLocation(
    stockId: string,
    payload: { zoneId: string | null; binId: string | null },
    executor: Queryable | DatabaseTransaction
  ) {
    const sql = `
      UPDATE inventory_stocks
      SET zone_id = ?, bin_id = ?, updated_at = NOW()
      WHERE id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [payload.zoneId, payload.binId, stockId]);
  }

  async deleteStock(stockId: string, executor: Queryable | DatabaseTransaction) {
    const sql = `
      DELETE FROM inventory_stocks
      WHERE id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [stockId]);
  }

  async findInventoryItemReference(
    tenantId: string,
    input: { productId?: string; productVariantId?: string },
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<InventoryItemReference | null> {
    if (input.productId) {
      const sql = `
        SELECT
          p.id AS productId,
          NULL AS productVariantId,
          p.product_type AS productType,
          p.track_inventory AS trackInventory,
          p.name AS productName,
          NULL AS variantName,
          p.sku AS sku
        FROM products p
        WHERE p.id = ? AND p.tenant_id = ? AND p.deleted_at IS NULL
        LIMIT 1
      `;
      const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [input.productId, tenantId]);
      return (rows[0] as InventoryItemReference | undefined) ?? null;
    }

    if (input.productVariantId) {
      const sql = `
        SELECT
          NULL AS productId,
          pv.id AS productVariantId,
          p.product_type AS productType,
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
      return (rows[0] as InventoryItemReference | undefined) ?? null;
    }

    return null;
  }

  async findStockByLocatorForUpdate(
    locator: StockLocatorInput,
    executor: Queryable | DatabaseTransaction
  ): Promise<InventoryStockRow | null> {
    const sql = `
      SELECT *
      FROM inventory_stocks
      WHERE tenant_id = ?
        AND warehouse_id = ?
        AND ((bin_id IS NULL AND ? IS NULL) OR bin_id = ?)
        AND ((product_id IS NULL AND ? IS NULL) OR product_id = ?)
        AND ((product_variant_id IS NULL AND ? IS NULL) OR product_variant_id = ?)
      LIMIT 1
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [
      locator.tenantId,
      locator.warehouseId,
      locator.binId,
      locator.binId,
      locator.productId,
      locator.productId,
      locator.productVariantId,
      locator.productVariantId,
    ]);
    return (rows as InventoryStockRow[])[0] ?? null;
  }

  async createStock(stock: InventoryStockRow, executor: Queryable | DatabaseTransaction) {
    const sql = `
      INSERT INTO inventory_stocks
      (
        id, tenant_id, warehouse_id, zone_id, bin_id,
        product_id, product_variant_id,
        on_hand_quantity, reserved_quantity, available_quantity,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      stock.id,
      stock.tenant_id,
      stock.warehouse_id,
      stock.zone_id,
      stock.bin_id,
      stock.product_id,
      stock.product_variant_id,
      stock.on_hand_quantity,
      stock.reserved_quantity,
      stock.available_quantity,
    ]);
  }

  async updateStockQuantities(
    stockId: string,
    quantities: { onHand: string; reserved: string; available: string },
    executor: Queryable | DatabaseTransaction
  ) {
    const sql = `
      UPDATE inventory_stocks
      SET on_hand_quantity = ?, reserved_quantity = ?, available_quantity = ?, updated_at = NOW()
      WHERE id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      quantities.onHand,
      quantities.reserved,
      quantities.available,
      stockId,
    ]);
  }

  async createMovement(movement: InventoryMovement, executor: Queryable | DatabaseTransaction) {
    const sql = `
      INSERT INTO inventory_movements
      (
        id, tenant_id, warehouse_id, zone_id, bin_id,
        product_id, product_variant_id, movement_type,
        lot_id, container_id, cost_layer_id,
        reference_type, reference_id, quantity, notes,
        created_by, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      movement.id,
      movement.tenant_id,
      movement.warehouse_id,
      movement.zone_id,
      movement.bin_id,
      movement.product_id,
      movement.product_variant_id,
      movement.movement_type,
      movement.lot_id ?? null,
      movement.container_id ?? null,
      movement.cost_layer_id ?? null,
      movement.reference_type,
      movement.reference_id,
      movement.quantity,
      movement.notes,
      movement.created_by,
    ]);
  }

  async createTransfer(transfer: WarehouseTransfer, executor: Queryable | DatabaseTransaction) {
    const sql = `
      INSERT INTO warehouse_transfers
      (
        id, tenant_id, transfer_number, source_warehouse_id, destination_warehouse_id,
        status, notes, requested_at, completed_at, created_by, updated_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      transfer.id,
      transfer.tenant_id,
      transfer.transfer_number,
      transfer.source_warehouse_id,
      transfer.destination_warehouse_id,
      transfer.status,
      transfer.notes,
      transfer.requested_at,
      transfer.completed_at,
      transfer.created_by,
      transfer.updated_by,
    ]);
  }

  async createTransferItem(item: WarehouseTransferItem, executor: Queryable | DatabaseTransaction) {
    const sql = `
      INSERT INTO warehouse_transfer_items
      (
        id, tenant_id, transfer_id, product_id, product_variant_id,
        quantity, source_bin_id, destination_bin_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      item.id,
      item.tenant_id,
      item.transfer_id,
      item.product_id,
      item.product_variant_id,
      item.quantity,
      item.source_bin_id,
      item.destination_bin_id,
    ]);
  }

  async listTransfers(tenantId: string, filters: TransferListFilters): Promise<WarehouseTransferDetailRow[]> {
    const params: Array<string | number> = [tenantId];
    const where = ['t.tenant_id = ?'];

    if (filters.status) {
      where.push('t.status = ?');
      params.push(filters.status);
    }
    if (filters.sourceWarehouseId) {
      where.push('t.source_warehouse_id = ?');
      params.push(filters.sourceWarehouseId);
    }
    if (filters.destinationWarehouseId) {
      where.push('t.destination_warehouse_id = ?');
      params.push(filters.destinationWarehouseId);
    }

    const limit = Number(filters.limit);
    const offset = (Number(filters.page) - 1) * limit;
    const sql = `
      SELECT
        t.*,
        sw.name AS source_warehouse_name,
        dw.name AS destination_warehouse_name
      FROM warehouse_transfers t
      INNER JOIN warehouses sw ON sw.id = t.source_warehouse_id AND sw.tenant_id = t.tenant_id AND sw.deleted_at IS NULL
      INNER JOIN warehouses dw ON dw.id = t.destination_warehouse_id AND dw.tenant_id = t.tenant_id AND dw.deleted_at IS NULL
      WHERE ${where.join(' AND ')}
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, params);
    return rows as WarehouseTransferDetailRow[];
  }

  async countTransfers(tenantId: string, filters: TransferListFilters): Promise<number> {
    const params: Array<string | number> = [tenantId];
    const where = ['tenant_id = ?'];

    if (filters.status) {
      where.push('status = ?');
      params.push(filters.status);
    }
    if (filters.sourceWarehouseId) {
      where.push('source_warehouse_id = ?');
      params.push(filters.sourceWarehouseId);
    }
    if (filters.destinationWarehouseId) {
      where.push('destination_warehouse_id = ?');
      params.push(filters.destinationWarehouseId);
    }

    const sql = `
      SELECT COUNT(*) AS total
      FROM warehouse_transfers
      WHERE ${where.join(' AND ')}
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }

  async findTransferById(
    tenantId: string,
    transferId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<WarehouseTransferDetailRow | null> {
    const sql = `
      SELECT
        t.*,
        sw.name AS source_warehouse_name,
        dw.name AS destination_warehouse_name
      FROM warehouse_transfers t
      INNER JOIN warehouses sw ON sw.id = t.source_warehouse_id AND sw.tenant_id = t.tenant_id AND sw.deleted_at IS NULL
      INNER JOIN warehouses dw ON dw.id = t.destination_warehouse_id AND dw.tenant_id = t.tenant_id AND dw.deleted_at IS NULL
      WHERE t.tenant_id = ? AND t.id = ?
      LIMIT 1
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, transferId]);
    return (rows as WarehouseTransferDetailRow[])[0] ?? null;
  }

  async findTransferByIdForUpdate(
    tenantId: string,
    transferId: string,
    executor: Queryable | DatabaseTransaction
  ): Promise<WarehouseTransfer | null> {
    const sql = `
      SELECT *
      FROM warehouse_transfers
      WHERE tenant_id = ? AND id = ?
      LIMIT 1
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [tenantId, transferId]);
    return (rows as WarehouseTransfer[])[0] ?? null;
  }

  async listTransferItems(
    tenantId: string,
    transferId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<WarehouseTransferItemDetailRow[]> {
    const sql = `
      SELECT
        ti.*,
        p.name AS product_name,
        pv.name AS variant_name,
        p.product_type,
        COALESCE(pv.sku, p.sku) AS sku
      FROM warehouse_transfer_items ti
      LEFT JOIN products p
        ON p.id = ti.product_id
       AND p.tenant_id = ti.tenant_id
       AND p.deleted_at IS NULL
      LEFT JOIN product_variants pv
        ON pv.id = ti.product_variant_id
       AND pv.tenant_id = ti.tenant_id
       AND pv.deleted_at IS NULL
      WHERE ti.tenant_id = ? AND ti.transfer_id = ?
      ORDER BY ti.created_at ASC, ti.id ASC
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, transferId]);
    return rows as WarehouseTransferItemDetailRow[];
  }

  async updateTransferStatus(
    tenantId: string,
    transferId: string,
    payload: { status: string; completedAt: Date | null; updatedBy: string },
    executor: Queryable | DatabaseTransaction
  ) {
    const sql = `
      UPDATE warehouse_transfers
      SET status = ?, completed_at = ?, updated_by = ?, updated_at = NOW()
      WHERE tenant_id = ? AND id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.status,
      payload.completedAt,
      payload.updatedBy,
      tenantId,
      transferId,
    ]);
  }

  async createInventoryCostLayer(layer: InventoryCostLayer, executor: Queryable | DatabaseTransaction) {
    const sql = `
      INSERT INTO inventory_cost_layers
      (
        id, tenant_id, warehouse_id, product_id, product_variant_id, lot_id, container_id,
        reference_type, reference_id, receipt_date, qty_received, qty_remaining, unit_cost, landed_cost,
        currency_code, created_by, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      layer.id,
      layer.tenant_id,
      layer.warehouse_id,
      layer.product_id,
      layer.product_variant_id,
      layer.lot_id,
      layer.container_id,
      layer.reference_type,
      layer.reference_id,
      layer.receipt_date,
      layer.qty_received,
      layer.qty_remaining,
      layer.unit_cost,
      layer.landed_cost,
      layer.currency_code,
      layer.created_by,
    ]);
  }

  async findAvailableCostLayers(
    tenantId: string,
    warehouseId: string,
    productId: string | null,
    productVariantId: string | null,
    executor: Queryable | DatabaseTransaction
  ): Promise<InventoryCostLayer[]> {
    const sql = `
      SELECT *
      FROM inventory_cost_layers
      WHERE tenant_id = ?
        AND warehouse_id = ?
        AND ((product_id IS NULL AND ? IS NULL) OR product_id = ?)
        AND ((product_variant_id IS NULL AND ? IS NULL) OR product_variant_id = ?)
        AND qty_remaining > 0
      ORDER BY receipt_date ASC, created_at ASC
      FOR UPDATE
    `;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(sql, [
      tenantId,
      warehouseId,
      productId,
      productId,
      productVariantId,
      productVariantId,
    ]);
    return rows as InventoryCostLayer[];
  }

  async updateCostLayerRemainingQty(
    layerId: string,
    qtyRemaining: string,
    executor: Queryable | DatabaseTransaction
  ) {
    const sql = `
      UPDATE inventory_cost_layers
      SET qty_remaining = ?
      WHERE id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [qtyRemaining, layerId]);
  }

  async createLayerConsumption(consumption: InventoryLayerConsumption, executor: Queryable | DatabaseTransaction) {
    const sql = `
      INSERT INTO inventory_layer_consumptions
      (
        id, tenant_id, inventory_cost_layer_id, reference_type, reference_id,
        consumed_quantity, unit_cost, created_by, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      consumption.id,
      consumption.tenant_id,
      consumption.inventory_cost_layer_id,
      consumption.reference_type,
      consumption.reference_id,
      consumption.consumed_quantity,
      consumption.unit_cost,
      consumption.created_by,
    ]);
  }
}
