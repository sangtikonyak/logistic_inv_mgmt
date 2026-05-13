import { DatabaseRow, QueryParams, Queryable } from '../../../database/database.types';
import {
  DashboardSummaryFilters,
  InventoryMovementSummaryFilters,
  InventorySummaryFilters,
  LowStockFilters,
  PurchaseSummaryFilters,
  RankingFilters,
  ReturnsSummaryFilters,
  SalesReservationsTrendFilters,
  SalesSummaryFilters,
  TrendFilters,
  TrendGroupBy,
  WarehouseSummaryFilters,
} from '../types/reporting.types';

type SummaryRow = DatabaseRow & Record<string, unknown>;

export class ReportingRepository {
  constructor(private readonly db: Queryable) {}

  async getDashboardSummary(tenantId: string, filters: DashboardSummaryFilters) {
    const warehouseClause = filters.warehouseId ? ' AND warehouse_id = ?' : '';
    const warehouseParams = filters.warehouseId ? [filters.warehouseId] : [];
    const shipmentDate = this.buildWarehouseDateClause('shipment_date', filters);
    const purchaseReturnDate = this.buildWarehouseDateClause('return_date', filters);
    const salesReturnDate = this.buildWarehouseDateClause('return_date', filters);
    const orderDate = this.buildWarehouseDateClause('order_date', filters);

    const sql = `
      SELECT
        (SELECT COUNT(*) FROM products WHERE tenant_id = ? AND deleted_at IS NULL) AS totalProducts,
        (SELECT COUNT(*) FROM warehouses WHERE tenant_id = ? AND deleted_at IS NULL AND status = 'ACTIVE') AS activeWarehouses,
        (SELECT COUNT(*) FROM suppliers WHERE tenant_id = ? AND deleted_at IS NULL AND status = 'ACTIVE') AS totalSuppliers,
        (SELECT COUNT(*) FROM customers WHERE tenant_id = ? AND deleted_at IS NULL AND status = 'ACTIVE') AS totalCustomers,
        (
          SELECT COALESCE(CAST(SUM(on_hand_quantity) AS DOUBLE), 0)
          FROM inventory_stocks
          WHERE tenant_id = ?${warehouseClause}
        ) AS totalOnHandQuantity,
        (
          SELECT COALESCE(CAST(SUM(reserved_quantity) AS DOUBLE), 0)
          FROM inventory_stocks
          WHERE tenant_id = ?${warehouseClause}
        ) AS totalReservedQuantity,
        (
          SELECT COUNT(*)
          FROM inventory_stocks s
          LEFT JOIN products p ON p.id = s.product_id
          LEFT JOIN product_variants pv ON pv.id = s.product_variant_id
          LEFT JOIN products vp ON vp.id = pv.product_id
          WHERE s.tenant_id = ?${warehouseClause}
            AND (
              (s.product_id IS NOT NULL AND p.min_stock_level IS NOT NULL AND s.available_quantity < p.min_stock_level)
              OR
              (s.product_variant_id IS NOT NULL AND vp.min_stock_level IS NOT NULL AND s.available_quantity < vp.min_stock_level)
            )
        ) AS lowStockItemCount,
        (
          SELECT COUNT(*)
          FROM purchase_orders
          WHERE tenant_id = ? AND deleted_at IS NULL AND status = 'DRAFT'${orderDate.clause}
        ) AS draftPurchaseOrderCount,
        (
          SELECT COUNT(*)
          FROM purchase_orders
          WHERE tenant_id = ? AND deleted_at IS NULL AND status = 'ISSUED'${orderDate.clause}
        ) AS issuedPurchaseOrderCount,
        (
          SELECT COUNT(*)
          FROM sales_orders
          WHERE tenant_id = ? AND deleted_at IS NULL AND status = 'DRAFT'${orderDate.clause}
        ) AS draftSalesOrderCount,
        (
          SELECT COUNT(*)
          FROM sales_orders
          WHERE tenant_id = ? AND deleted_at IS NULL AND status IN ('CONFIRMED', 'PARTIALLY_RESERVED', 'RESERVED', 'PARTIALLY_SHIPPED')${orderDate.clause}
        ) AS confirmedSalesOrderCount,
        (
          SELECT COUNT(*)
          FROM sales_shipments
          WHERE tenant_id = ? AND status = 'DRAFT'${shipmentDate.clause}
        ) AS pendingShipmentCount,
        (
          SELECT COUNT(*)
          FROM purchase_returns
          WHERE tenant_id = ?${purchaseReturnDate.clause}
        ) AS purchaseReturnCount,
        (
          SELECT COUNT(*)
          FROM sales_returns
          WHERE tenant_id = ?${salesReturnDate.clause}
        ) AS salesReturnCount,
        (
          SELECT COALESCE(CAST(SUM(total_amount) AS DOUBLE), 0)
          FROM sales_orders
          WHERE tenant_id = ? AND deleted_at IS NULL AND status != 'CANCELLED'${orderDate.clause}
        ) AS totalSalesAmount,
        (
          SELECT COALESCE(CAST(SUM(total_amount) AS DOUBLE), 0)
          FROM purchase_orders
          WHERE tenant_id = ? AND deleted_at IS NULL AND status != 'CANCELLED'${orderDate.clause}
        ) AS totalPurchaseAmount
    `;

    const params: QueryParams = [];
    params.push(tenantId, tenantId, tenantId, tenantId);

    // inventory totals + low stock
    for (let i = 0; i < 3; i += 1) {
      params.push(tenantId, ...warehouseParams);
    }

    // PO/SO counters + total amounts (using orderDate)
    for (let i = 0; i < 4; i += 1) {
      params.push(tenantId, ...orderDate.params);
    }

    // shipment / return counters (optionally warehouse + date range)
    params.push(tenantId, ...shipmentDate.params);
    params.push(tenantId, ...purchaseReturnDate.params);
    params.push(tenantId, ...salesReturnDate.params);

    // Final total sales and purchase amounts
    params.push(tenantId, ...orderDate.params);
    params.push(tenantId, ...orderDate.params);

    const [rows] = await this.db.execute<SummaryRow[]>(sql, params);
    return rows[0] ?? null;
  }

  async getInventoryStockSummary(tenantId: string, filters: InventorySummaryFilters) {
    const filter = this.buildInventoryStockFilter(filters);

    const [totals] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          COUNT(*) AS stockRows,
          COUNT(DISTINCT COALESCE(product_variant_id, product_id)) AS uniqueItems,
          COALESCE(CAST(SUM(on_hand_quantity) AS DOUBLE), 0) AS totalOnHandQuantity,
          COALESCE(CAST(SUM(available_quantity) AS DOUBLE), 0) AS totalAvailableQuantity,
          COALESCE(CAST(SUM(reserved_quantity) AS DOUBLE), 0) AS totalReservedQuantity
        FROM inventory_stocks
        WHERE tenant_id = ?${filter.clause}
      `,
      [tenantId, ...filter.params],
    );

    const [byWarehouse] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          w.id AS warehouseId,
          w.name AS warehouseName,
          COUNT(*) AS stockRows,
          COALESCE(CAST(SUM(s.on_hand_quantity) AS DOUBLE), 0) AS totalOnHandQuantity,
          COALESCE(CAST(SUM(s.available_quantity) AS DOUBLE), 0) AS totalAvailableQuantity,
          COALESCE(CAST(SUM(s.reserved_quantity) AS DOUBLE), 0) AS totalReservedQuantity
        FROM inventory_stocks s
        INNER JOIN warehouses w ON w.id = s.warehouse_id
        WHERE s.tenant_id = ?${filter.clause}
        GROUP BY w.id, w.name
        ORDER BY w.name ASC
      `,
      [tenantId, ...filter.params],
    );

    return {
      summary: totals[0] ?? null,
      byWarehouse,
    };
  }

  async getInventoryMovementSummary(tenantId: string, filters: InventoryMovementSummaryFilters) {
    const filter = this.buildInventoryMovementFilter(filters);

    const [summaryRows] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          COUNT(*) AS totalMovements,
          COALESCE(CAST(SUM(CASE WHEN movement_type IN ('RECEIPT', 'ADJUSTMENT_IN', 'TRANSFER_IN', 'OPENING') THEN quantity ELSE 0 END) AS DOUBLE), 0) AS inboundQuantity,
          COALESCE(CAST(SUM(CASE WHEN movement_type IN ('ISSUE', 'ADJUSTMENT_OUT', 'TRANSFER_OUT') THEN quantity ELSE 0 END) AS DOUBLE), 0) AS outboundQuantity,
          COALESCE(CAST(SUM(CASE WHEN movement_type = 'RESERVATION' THEN quantity ELSE 0 END) AS DOUBLE), 0) AS reservedQuantity,
          COALESCE(CAST(SUM(CASE WHEN movement_type = 'RESERVATION_RELEASE' THEN quantity ELSE 0 END) AS DOUBLE), 0) AS releasedQuantity
        FROM inventory_movements
        WHERE tenant_id = ?${filter.clause}
      `,
      [tenantId, ...filter.params],
    );

    const [byMovementType] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          movement_type AS movementType,
          COUNT(*) AS movementCount,
          COALESCE(CAST(SUM(quantity) AS DOUBLE), 0) AS totalQuantity
        FROM inventory_movements
        WHERE tenant_id = ?${filter.clause}
        GROUP BY movement_type
        ORDER BY movement_type ASC
      `,
      [tenantId, ...filter.params],
    );

    const [byReferenceType] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          COALESCE(reference_type, 'UNSPECIFIED') AS referenceType,
          COUNT(*) AS movementCount,
          COALESCE(CAST(SUM(quantity) AS DOUBLE), 0) AS totalQuantity
        FROM inventory_movements
        WHERE tenant_id = ?${filter.clause}
        GROUP BY COALESCE(reference_type, 'UNSPECIFIED')
        ORDER BY movementCount DESC, referenceType ASC
      `,
      [tenantId, ...filter.params],
    );

    return {
      summary: summaryRows[0] ?? null,
      byMovementType,
      byReferenceType,
    };
  }

  async getLowStockReport(tenantId: string, filters: LowStockFilters) {
    const { clause, params } = this.buildLowStockFilter(tenantId, filters);
    const offset = (filters.page - 1) * filters.limit;

    const [rows] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          s.id,
          w.id AS warehouseId,
          w.name AS warehouseName,
          s.product_id AS productId,
          s.product_variant_id AS productVariantId,
          COALESCE(p.name, vp.name) AS productName,
          pv.name AS variantName,
          COALESCE(CAST(s.on_hand_quantity AS DOUBLE), 0) AS onHandQuantity,
          COALESCE(CAST(s.available_quantity AS DOUBLE), 0) AS availableQuantity,
          COALESCE(CAST(s.reserved_quantity AS DOUBLE), 0) AS reservedQuantity,
          COALESCE(CAST(p.min_stock_level AS DOUBLE), CAST(vp.min_stock_level AS DOUBLE), 0) AS minStockLevel,
          GREATEST(COALESCE(CAST(p.min_stock_level AS DOUBLE), CAST(vp.min_stock_level AS DOUBLE), 0) - COALESCE(CAST(s.available_quantity AS DOUBLE), 0), 0) AS shortageQuantity
        FROM inventory_stocks s
        INNER JOIN warehouses w ON w.id = s.warehouse_id
        LEFT JOIN products p ON p.id = s.product_id
        LEFT JOIN product_variants pv ON pv.id = s.product_variant_id
        LEFT JOIN products vp ON vp.id = pv.product_id
        WHERE s.tenant_id = ?${clause}
          AND (
            (s.product_id IS NOT NULL AND p.min_stock_level IS NOT NULL AND s.available_quantity < p.min_stock_level)
            OR
            (s.product_variant_id IS NOT NULL AND vp.min_stock_level IS NOT NULL AND s.available_quantity < vp.min_stock_level)
          )
        ORDER BY shortageQuantity DESC, productName ASC
        LIMIT ${filters.limit} OFFSET ${offset}
      `,
      params,
    );

    return rows;
  }

  async countLowStock(tenantId: string, filters: LowStockFilters) {
    const { clause, params } = this.buildLowStockFilter(tenantId, filters);

    const [rows] = await this.db.execute<SummaryRow[]>(
      `
        SELECT COUNT(*) AS total
        FROM inventory_stocks s
        LEFT JOIN products p ON p.id = s.product_id
        LEFT JOIN product_variants pv ON pv.id = s.product_variant_id
        LEFT JOIN products vp ON vp.id = pv.product_id
        WHERE s.tenant_id = ?${clause}
          AND (
            (s.product_id IS NOT NULL AND p.min_stock_level IS NOT NULL AND s.available_quantity < p.min_stock_level)
            OR
            (s.product_variant_id IS NOT NULL AND vp.min_stock_level IS NOT NULL AND s.available_quantity < vp.min_stock_level)
          )
      `,
      params,
    );

    return Number(rows[0]?.total ?? 0);
  }

  private buildLowStockFilter(tenantId: string, filters: { warehouseId?: string; productId?: string }) {
    const clauses: string[] = [];
    const params: QueryParams = [tenantId];

    if (filters.warehouseId) {
      clauses.push('s.warehouse_id = ?');
      params.push(filters.warehouseId);
    }

    if (filters.productId) {
      clauses.push('(s.product_id = ? OR pv.product_id = ?)');
      params.push(filters.productId, filters.productId);
    }

    return {
      clause: clauses.length ? ` AND ${clauses.join(' AND ')}` : '',
      params,
    };
  }

  async getInventoryValuation(tenantId: string, filters: { warehouseId?: string; productId?: string }) {
    const filter = this.buildInventoryStockFilter(filters);

    const [totals] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          COALESCE(
            CAST(
              SUM(
                s.on_hand_quantity * COALESCE(pv.cost_price, p.cost_price, 0)
              ) AS DOUBLE
            ),
            0
          ) AS totalValuation
        FROM inventory_stocks s
        LEFT JOIN products p ON p.id = s.product_id
        LEFT JOIN product_variants pv ON pv.id = s.product_variant_id
        WHERE s.tenant_id = ?${filter.clause}
      `,
      [tenantId, ...filter.params],
    );

    const [byWarehouse] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          w.id AS warehouseId,
          w.name AS warehouseName,
          COALESCE(
            CAST(
              SUM(
                s.on_hand_quantity * COALESCE(pv.cost_price, p.cost_price, 0)
              ) AS DOUBLE
            ),
            0
          ) AS totalValuation
        FROM inventory_stocks s
        INNER JOIN warehouses w ON w.id = s.warehouse_id
        LEFT JOIN products p ON p.id = s.product_id
        LEFT JOIN product_variants pv ON pv.id = s.product_variant_id
        WHERE s.tenant_id = ?${filter.clause}
        GROUP BY w.id, w.name
        ORDER BY totalValuation DESC, w.name ASC
      `,
      [tenantId, ...filter.params],
    );

    return {
      summary: totals[0] ?? null,
      byWarehouse,
    };
  }

  async getPurchaseSummary(tenantId: string, filters: PurchaseSummaryFilters) {
    const filter = this.buildPurchaseOrderFilter(filters);
    const receiptFilter = this.buildPurchaseReceiptFilter(filters);

    const [summaryRows] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          COUNT(*) AS purchaseOrderCount,
          COALESCE(CAST(SUM(po.total_amount) AS DOUBLE), 0) AS totalOrderAmount,
          COUNT(DISTINCT po.supplier_id) AS activeSupplierCount,
          SUM(CASE WHEN po.status IN ('ISSUED', 'PARTIALLY_RECEIVED') THEN 1 ELSE 0 END) AS openPurchaseOrderCount
        FROM purchase_orders po
        WHERE po.tenant_id = ? AND po.deleted_at IS NULL${filter.clause}
      `,
      [tenantId, ...filter.params],
    );

    const [orderItemTotals] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          COALESCE(CAST(SUM(poi.ordered_quantity) AS DOUBLE), 0) AS totalOrderedQuantity
        FROM purchase_order_items poi
        INNER JOIN purchase_orders po ON po.id = poi.purchase_order_id AND po.tenant_id = poi.tenant_id
        WHERE poi.tenant_id = ? AND po.deleted_at IS NULL${filter.clause}
      `,
      [tenantId, ...filter.params],
    );

    const [statusCounts] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          po.status AS status,
          COUNT(*) AS orderCount
        FROM purchase_orders po
        WHERE po.tenant_id = ? AND po.deleted_at IS NULL${filter.clause}
        GROUP BY po.status
        ORDER BY po.status ASC
      `,
      [tenantId, ...filter.params],
    );

    const [receiptTotals] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          COUNT(*) AS receiptCount,
          COALESCE(CAST(SUM(pri.received_quantity) AS DOUBLE), 0) AS totalReceivedQuantity
        FROM purchase_receipts pr
        LEFT JOIN purchase_receipt_items pri ON pri.purchase_receipt_id = pr.id AND pri.tenant_id = pr.tenant_id
        WHERE pr.tenant_id = ? AND pr.status = 'POSTED'${receiptFilter.clause}
      `,
      [tenantId, ...receiptFilter.params],
    );

    return {
      summary: {
        ...(summaryRows[0] ?? {}),
        ...(orderItemTotals[0] ?? {}),
        ...(receiptTotals[0] ?? {}),
      },
      statusCounts,
    };
  }

  async getPurchasesBySupplier(tenantId: string, filters: { dateFrom?: string; dateTo?: string; supplierId?: string; limit: number }) {
    const orderDateClause = this.buildDateOnlyClause('po.order_date', filters);
    const receiptDateClause = this.buildDateOnlyClause('pr.receipt_date', filters);

    const safeLimit = Number.isFinite(Number(filters.limit))
      ? Math.max(1, Math.min(100, Math.trunc(Number(filters.limit))))
      : 10;

    const [rows] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          s.id AS supplierId,
          s.name AS supplierName,
          (
            SELECT COUNT(*)
            FROM purchase_orders po
            WHERE po.tenant_id = s.tenant_id
              AND po.deleted_at IS NULL
              AND po.supplier_id = s.id
              ${orderDateClause.clause}
          ) AS purchaseOrderCount,
          (
            SELECT COUNT(*)
            FROM purchase_receipts pr
            WHERE pr.tenant_id = s.tenant_id
              AND pr.status = 'POSTED'
              AND pr.supplier_id = s.id
              ${receiptDateClause.clause}
          ) AS postedReceiptCount,
          (
            SELECT COALESCE(CAST(SUM(poi.ordered_quantity) AS DOUBLE), 0)
            FROM purchase_order_items poi
            INNER JOIN purchase_orders po ON po.id = poi.purchase_order_id AND po.tenant_id = poi.tenant_id
            WHERE po.tenant_id = s.tenant_id
              AND po.deleted_at IS NULL
              AND po.supplier_id = s.id
              ${orderDateClause.clause}
          ) AS totalOrderedQuantity,
          (
            SELECT COALESCE(CAST(SUM(pri.received_quantity) AS DOUBLE), 0)
            FROM purchase_receipt_items pri
            INNER JOIN purchase_receipts pr ON pr.id = pri.purchase_receipt_id AND pr.tenant_id = pri.tenant_id
            WHERE pr.tenant_id = s.tenant_id
              AND pr.status = 'POSTED'
              AND pr.supplier_id = s.id
              ${receiptDateClause.clause}
          ) AS totalReceivedQuantity,
          (
            SELECT COALESCE(CAST(SUM(po.total_amount) AS DOUBLE), 0)
            FROM purchase_orders po
            WHERE po.tenant_id = s.tenant_id
              AND po.deleted_at IS NULL
              AND po.supplier_id = s.id
              ${orderDateClause.clause}
          ) AS totalSpend
        FROM suppliers s
        WHERE s.tenant_id = ? AND s.deleted_at IS NULL${filters.supplierId ? ' AND s.id = ?' : ''}
        ORDER BY totalSpend DESC, s.name ASC
        LIMIT ${safeLimit}
      `,
      filters.supplierId
        ? [
            ...orderDateClause.params,
            ...receiptDateClause.params,
            ...orderDateClause.params,
            ...receiptDateClause.params,
            ...orderDateClause.params,
            tenantId,
            filters.supplierId,
          ]
        : [
            ...orderDateClause.params,
            ...receiptDateClause.params,
            ...orderDateClause.params,
            ...receiptDateClause.params,
            ...orderDateClause.params,
            tenantId,
          ],
    );

    return rows;
  }

  async getPurchaseReceiptsTrend(tenantId: string, filters: TrendFilters) {
    const trend = this.buildTrendExpressions('pr.receipt_date', filters.groupBy);
    const clauses: string[] = [];
    const params: QueryParams = [tenantId];

    if (filters.supplierId) {
      clauses.push('pr.supplier_id = ?');
      params.push(filters.supplierId);
    }

    if (filters.warehouseId) {
      clauses.push('pr.warehouse_id = ?');
      params.push(filters.warehouseId);
    }

    this.addDateRangeClause(clauses, params, 'pr.receipt_date', filters);
    const whereClause = clauses.length ? ` AND ${clauses.join(' AND ')}` : '';

    const [rows] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          ${trend.bucketExpression} AS bucket,
          COUNT(DISTINCT pr.id) AS receiptCount,
          COALESCE(CAST(SUM(pri.received_quantity) AS DOUBLE), 0) AS receivedQuantity,
          COALESCE(CAST(SUM(pri.received_quantity * pri.unit_cost) AS DOUBLE), 0) AS receivedValue
        FROM purchase_receipts pr
        LEFT JOIN purchase_receipt_items pri
          ON pri.purchase_receipt_id = pr.id
          AND pri.tenant_id = pr.tenant_id
        WHERE pr.tenant_id = ? AND pr.status = 'POSTED'${whereClause}
        GROUP BY ${trend.groupExpression}
        ORDER BY ${trend.sortExpression} ASC
      `,
      params,
    );

    return rows;
  }

  async getSalesSummary(tenantId: string, filters: SalesSummaryFilters) {
    const orderFilter = this.buildSalesOrderFilter(filters);
    const shipmentFilter = this.buildShipmentFilter(filters);

    const [summaryRows] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          COUNT(*) AS salesOrderCount,
          COALESCE(CAST(SUM(so.total_amount) AS DOUBLE), 0) AS totalSalesAmount,
          COUNT(DISTINCT so.customer_id) AS activeCustomerCount
        FROM sales_orders so
        WHERE so.tenant_id = ? AND so.deleted_at IS NULL AND so.status != 'CANCELLED'${orderFilter.clause}
      `,
      [tenantId, ...orderFilter.params],
    );

    const [orderItemTotals] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          COALESCE(CAST(SUM(soi.ordered_quantity) AS DOUBLE), 0) AS totalOrderedQuantity,
          COALESCE(CAST(SUM(soi.reserved_quantity) AS DOUBLE), 0) AS totalReservedQuantity
        FROM sales_order_items soi
        INNER JOIN sales_orders so ON so.id = soi.sales_order_id AND so.tenant_id = soi.tenant_id
        WHERE soi.tenant_id = ? AND so.deleted_at IS NULL AND so.status != 'CANCELLED'${orderFilter.clause}
      `,
      [tenantId, ...orderFilter.params],
    );

    const [statusCounts] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          so.status AS status,
          COUNT(*) AS orderCount
        FROM sales_orders so
        WHERE so.tenant_id = ? AND so.deleted_at IS NULL${orderFilter.clause}
        GROUP BY so.status
        ORDER BY so.status ASC
      `,
      [tenantId, ...orderFilter.params],
    );

    const [shipmentTotals] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          COUNT(*) AS postedShipmentCount,
          COALESCE(CAST(SUM(ssi.shipped_quantity) AS DOUBLE), 0) AS totalShippedQuantity
        FROM sales_shipments ss
        LEFT JOIN sales_shipment_items ssi ON ssi.sales_shipment_id = ss.id AND ssi.tenant_id = ss.tenant_id
        WHERE ss.tenant_id = ? AND ss.status = 'POSTED'${shipmentFilter.clause}
      `,
      [tenantId, ...shipmentFilter.params],
    );

    return {
      summary: {
        ...(summaryRows[0] ?? {}),
        ...(orderItemTotals[0] ?? {}),
        ...(shipmentTotals[0] ?? {}),
      },
      statusCounts,
    };
  }

  async getSalesByCustomer(tenantId: string, filters: { dateFrom?: string; dateTo?: string; customerId?: string; limit: number }) {
    const orderDateClause = this.buildDateOnlyClause('so.order_date', filters);
    const shipmentDateClause = this.buildDateOnlyClause('ss.shipment_date', filters);

    const safeLimit = Number.isFinite(Number(filters.limit))
      ? Math.max(1, Math.min(100, Math.trunc(Number(filters.limit))))
      : 10;

    const [rows] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          c.id AS customerId,
          c.name AS customerName,
          (
            SELECT COUNT(*)
            FROM sales_orders so
            WHERE so.tenant_id = c.tenant_id
              AND so.deleted_at IS NULL
              AND so.status != 'CANCELLED'
              AND so.customer_id = c.id
              ${orderDateClause.clause}
          ) AS salesOrderCount,
          (
            SELECT COUNT(*)
            FROM sales_shipments ss
            INNER JOIN sales_orders so ON so.id = ss.sales_order_id AND so.tenant_id = ss.tenant_id
            WHERE ss.tenant_id = c.tenant_id
              AND ss.status = 'POSTED'
              AND so.status != 'CANCELLED'
              AND so.customer_id = c.id
              ${shipmentDateClause.clause}
          ) AS postedShipmentCount,
          (
            SELECT COALESCE(CAST(SUM(soi.ordered_quantity) AS DOUBLE), 0)
            FROM sales_order_items soi
            INNER JOIN sales_orders so ON so.id = soi.sales_order_id AND so.tenant_id = soi.tenant_id
            WHERE so.tenant_id = c.tenant_id
              AND so.deleted_at IS NULL
              AND so.status != 'CANCELLED'
              AND so.customer_id = c.id
              ${orderDateClause.clause}
          ) AS totalOrderedQuantity,
          (
            SELECT COALESCE(CAST(SUM(ssi.shipped_quantity) AS DOUBLE), 0)
            FROM sales_shipment_items ssi
            INNER JOIN sales_shipments ss ON ss.id = ssi.sales_shipment_id AND ss.tenant_id = ssi.tenant_id
            INNER JOIN sales_orders so ON so.id = ss.sales_order_id AND so.tenant_id = ss.tenant_id
            WHERE ss.tenant_id = c.tenant_id
              AND ss.status = 'POSTED'
              AND so.status != 'CANCELLED'
              AND so.customer_id = c.id
              ${shipmentDateClause.clause}
          ) AS totalShippedQuantity,
          (
            SELECT COALESCE(CAST(SUM(so.total_amount) AS DOUBLE), 0)
            FROM sales_orders so
            WHERE so.tenant_id = c.tenant_id
              AND so.deleted_at IS NULL
              AND so.status != 'CANCELLED'
              AND so.customer_id = c.id
              ${orderDateClause.clause}
          ) AS totalSalesAmount
        FROM customers c
        WHERE c.tenant_id = ? AND c.deleted_at IS NULL${filters.customerId ? ' AND c.id = ?' : ''}
        ORDER BY totalSalesAmount DESC, c.name ASC
        LIMIT ${safeLimit}
      `,
      filters.customerId
        ? [
            ...orderDateClause.params,
            ...shipmentDateClause.params,
            ...orderDateClause.params,
            ...shipmentDateClause.params,
            ...orderDateClause.params,
            tenantId,
            filters.customerId,
          ]
        : [
            ...orderDateClause.params,
            ...shipmentDateClause.params,
            ...orderDateClause.params,
            ...shipmentDateClause.params,
            ...orderDateClause.params,
            tenantId,
          ],
    );

    return rows;
  }

  async getSalesOrdersTrend(tenantId: string, filters: TrendFilters) {
    const trend = this.buildTrendExpressions('so.order_date', filters.groupBy);
    const clauses: string[] = [];
    const params: QueryParams = [tenantId];

    if (filters.customerId) {
      clauses.push('so.customer_id = ?');
      params.push(filters.customerId);
    }

    if (filters.warehouseId) {
      clauses.push('so.warehouse_id = ?');
      params.push(filters.warehouseId);
    }

    this.addDateRangeClause(clauses, params, 'so.order_date', filters);
    const whereClause = clauses.length ? ` AND ${clauses.join(' AND ')}` : '';

    const [rows] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          ${trend.bucketExpression} AS bucket,
          COUNT(DISTINCT so.id) AS salesOrderCount,
          COALESCE(CAST(SUM(soi.ordered_quantity) AS DOUBLE), 0) AS orderedQuantity,
          COALESCE(CAST(SUM(so.total_amount) AS DOUBLE), 0) AS salesAmount
        FROM sales_orders so
        LEFT JOIN sales_order_items soi
          ON soi.sales_order_id = so.id
          AND soi.tenant_id = so.tenant_id
        WHERE so.tenant_id = ? AND so.deleted_at IS NULL AND so.status != 'CANCELLED'${whereClause}
        GROUP BY ${trend.groupExpression}
        ORDER BY ${trend.sortExpression} ASC
      `,
      params,
    );

    return rows;
  }

  async getReturnsSummary(tenantId: string, filters: ReturnsSummaryFilters) {
    const purchaseFilter = this.buildPurchaseReturnFilter(filters);
    const salesFilter = this.buildSalesReturnFilter(filters);

    const [purchaseRows] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          COUNT(*) AS purchaseReturnCount,
          COALESCE(CAST(SUM(pri.returned_quantity) AS DOUBLE), 0) AS purchaseReturnedQuantity
        FROM purchase_returns pr
        LEFT JOIN purchase_return_items pri ON pri.purchase_return_id = pr.id AND pri.tenant_id = pr.tenant_id
        WHERE pr.tenant_id = ?${purchaseFilter.clause}
      `,
      [tenantId, ...purchaseFilter.params],
    );

    const [salesRows] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          COUNT(*) AS salesReturnCount,
          COALESCE(CAST(SUM(sri.returned_quantity) AS DOUBLE), 0) AS salesReturnedQuantity
        FROM sales_returns sr
        LEFT JOIN sales_return_items sri ON sri.sales_return_id = sr.id AND sri.tenant_id = sr.tenant_id
        WHERE sr.tenant_id = ?${salesFilter.clause}
      `,
      [tenantId, ...salesFilter.params],
    );

    const [purchaseStatusCounts] = await this.db.execute<SummaryRow[]>(
      `
        SELECT pr.status AS status, COUNT(*) AS returnCount
        FROM purchase_returns pr
        WHERE pr.tenant_id = ?${purchaseFilter.clause}
        GROUP BY pr.status
        ORDER BY pr.status ASC
      `,
      [tenantId, ...purchaseFilter.params],
    );

    const [salesStatusCounts] = await this.db.execute<SummaryRow[]>(
      `
        SELECT sr.status AS status, COUNT(*) AS returnCount
        FROM sales_returns sr
        WHERE sr.tenant_id = ?${salesFilter.clause}
        GROUP BY sr.status
        ORDER BY sr.status ASC
      `,
      [tenantId, ...salesFilter.params],
    );

    return {
      summary: {
        ...(purchaseRows[0] ?? {}),
        ...(salesRows[0] ?? {}),
      },
      purchaseStatusCounts,
      salesStatusCounts,
    };
  }

  async getReturnsTrend(tenantId: string, filters: TrendFilters) {
    const purchaseTrend = this.buildTrendExpressions('pr.return_date', filters.groupBy);
    const salesTrend = this.buildTrendExpressions('sr.return_date', filters.groupBy);
    const bucketExpr = this.buildTrendExpressions('x.bucketDate', filters.groupBy);
    const clauses: string[] = [];
    const params: QueryParams = [tenantId];

    if (filters.warehouseId) {
      clauses.push('x.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    this.addDateRangeClause(clauses, params, 'x.bucketDate', filters);
    const customerClause = filters.customerId ? ' AND x.customer_id = ?' : '';
    const supplierClause = filters.supplierId ? ' AND x.supplier_id = ?' : '';
    const whereClause = clauses.length ? ` AND ${clauses.join(' AND ')}` : '';

    const queryParams: QueryParams = [...params];
    if (filters.customerId) {
      queryParams.push(filters.customerId);
    }
    if (filters.supplierId) {
      queryParams.push(filters.supplierId);
    }

    const [rows] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          ${bucketExpr.bucketExpression} AS bucket,
          COALESCE(CAST(SUM(CASE WHEN x.returnType = 'SALES' THEN x.returnCount ELSE 0 END) AS DOUBLE), 0) AS salesReturnCount,
          COALESCE(CAST(SUM(CASE WHEN x.returnType = 'SALES' THEN x.returnedQuantity ELSE 0 END) AS DOUBLE), 0) AS salesReturnedQuantity,
          COALESCE(CAST(SUM(CASE WHEN x.returnType = 'PURCHASE' THEN x.returnCount ELSE 0 END) AS DOUBLE), 0) AS purchaseReturnCount,
          COALESCE(CAST(SUM(CASE WHEN x.returnType = 'PURCHASE' THEN x.returnedQuantity ELSE 0 END) AS DOUBLE), 0) AS purchaseReturnedQuantity
        FROM (
          SELECT
            pr.return_date AS bucketDate,
            pr.warehouse_id,
            NULL AS customer_id,
            pr.supplier_id AS supplier_id,
            'PURCHASE' AS returnType,
            COUNT(DISTINCT pr.id) AS returnCount,
            COALESCE(CAST(SUM(pri.returned_quantity) AS DOUBLE), 0) AS returnedQuantity
          FROM purchase_returns pr
          LEFT JOIN purchase_return_items pri ON pri.purchase_return_id = pr.id AND pri.tenant_id = pr.tenant_id
          WHERE pr.tenant_id = ?
          GROUP BY pr.id, pr.return_date, pr.warehouse_id, pr.supplier_id

          UNION ALL

          SELECT
            sr.return_date AS bucketDate,
            sr.warehouse_id,
            sr.customer_id AS customer_id,
            NULL AS supplier_id,
            'SALES' AS returnType,
            COUNT(DISTINCT sr.id) AS returnCount,
            COALESCE(CAST(SUM(sri.returned_quantity) AS DOUBLE), 0) AS returnedQuantity
          FROM sales_returns sr
          LEFT JOIN sales_return_items sri ON sri.sales_return_id = sr.id AND sri.tenant_id = sr.tenant_id
          WHERE sr.tenant_id = ?
          GROUP BY sr.id, sr.return_date, sr.warehouse_id, sr.customer_id
        ) x
        WHERE 1 = 1${whereClause}${customerClause}${supplierClause}
        GROUP BY ${bucketExpr.groupExpression}
        ORDER BY ${bucketExpr.sortExpression} ASC
      `,
      [tenantId, tenantId, ...queryParams.slice(1)],
    );

    return rows;
  }

  async getSalesShipmentsTrend(tenantId: string, filters: TrendFilters) {
    const trend = this.buildTrendExpressions('ss.shipment_date', filters.groupBy);
    const clauses: string[] = [];
    const params: QueryParams = [tenantId];

    if (filters.warehouseId) {
      clauses.push('ss.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    if (filters.customerId) {
      clauses.push('so.customer_id = ?');
      params.push(filters.customerId);
    }
    this.addDateRangeClause(clauses, params, 'ss.shipment_date', filters);
    const whereClause = clauses.length ? ` AND ${clauses.join(' AND ')}` : '';

    const [rows] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          ${trend.bucketExpression} AS bucket,
          COUNT(DISTINCT ss.id) AS shipmentCount,
          COALESCE(CAST(SUM(ssi.shipped_quantity) AS DOUBLE), 0) AS shippedQuantity
        FROM sales_shipments ss
        LEFT JOIN sales_shipment_items ssi ON ssi.sales_shipment_id = ss.id AND ssi.tenant_id = ss.tenant_id
        INNER JOIN sales_orders so ON so.id = ss.sales_order_id AND so.tenant_id = ss.tenant_id
        WHERE ss.tenant_id = ? AND ss.status = 'POSTED' AND so.status != 'CANCELLED'${whereClause}
        GROUP BY ${trend.groupExpression}
        ORDER BY ${trend.sortExpression} ASC
      `,
      params,
    );

    return rows;
  }

  async getSalesReservationsTrend(tenantId: string, filters: SalesReservationsTrendFilters) {
    const trend = this.buildTrendExpressions('im.created_at', filters.groupBy);
    const clauses: string[] = ["im.movement_type IN ('RESERVATION', 'RESERVATION_RELEASE')"];
    const params: QueryParams = [tenantId];

    if (filters.warehouseId) {
      clauses.push('im.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    if (filters.customerId) {
      clauses.push(
        'EXISTS (SELECT 1 FROM sales_reservations sr INNER JOIN sales_orders so ON so.id = sr.sales_order_id AND so.tenant_id = sr.tenant_id WHERE sr.id = im.reference_id AND sr.tenant_id = im.tenant_id AND so.customer_id = ? AND so.status != "CANCELLED")',
      );
      params.push(filters.customerId);
    }
    this.addDateRangeClause(clauses, params, 'im.created_at', filters);
    const whereClause = clauses.length ? ` AND ${clauses.join(' AND ')}` : '';

    const [rows] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          ${trend.bucketExpression} AS bucket,
          COALESCE(CAST(SUM(CASE WHEN im.movement_type = 'RESERVATION' THEN im.quantity ELSE 0 END) AS DOUBLE), 0) AS reservedQuantity,
          COALESCE(CAST(SUM(CASE WHEN im.movement_type = 'RESERVATION_RELEASE' THEN im.quantity ELSE 0 END) AS DOUBLE), 0) AS releasedQuantity,
          COALESCE(
            CAST(
              SUM(
                CASE
                  WHEN im.movement_type = 'RESERVATION' THEN im.quantity
                  WHEN im.movement_type = 'RESERVATION_RELEASE' THEN -im.quantity
                  ELSE 0
                END
              ) AS DOUBLE
            ),
            0
          ) AS netReservedQuantity
        FROM inventory_movements im
        WHERE im.tenant_id = ?${whereClause}
        GROUP BY ${trend.groupExpression}
        ORDER BY ${trend.sortExpression} ASC
      `,
      params,
    );

    return rows;
  }

  async getWarehouseSummary(tenantId: string, filters: WarehouseSummaryFilters) {
    const clauses: string[] = [];
    const params: QueryParams = [tenantId];
    if (filters.warehouseId) {
      clauses.push('w.id = ?');
      params.push(filters.warehouseId);
    }
    const whereClause = clauses.length ? ` AND ${clauses.join(' AND ')}` : '';

    const purchaseMovement = this.buildDateOnlyClause('pr.receipt_date', filters);
    const shipmentMovement = this.buildDateOnlyClause('ss.shipment_date', filters);
    const purchaseReturnMovement = this.buildDateOnlyClause('preturn.return_date', filters);
    const salesReturnMovement = this.buildDateOnlyClause('sreturn.return_date', filters);

    const [rows] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          w.id AS warehouseId,
          w.name AS warehouseName,
          (
            SELECT COALESCE(CAST(SUM(s.on_hand_quantity) AS DOUBLE), 0)
            FROM inventory_stocks s
            WHERE s.tenant_id = w.tenant_id AND s.warehouse_id = w.id
          ) AS totalOnHandQuantity,
          (
            SELECT COALESCE(CAST(SUM(s.available_quantity) AS DOUBLE), 0)
            FROM inventory_stocks s
            WHERE s.tenant_id = w.tenant_id AND s.warehouse_id = w.id
          ) AS totalAvailableQuantity,
          (
            SELECT COALESCE(CAST(SUM(s.reserved_quantity) AS DOUBLE), 0)
            FROM inventory_stocks s
            WHERE s.tenant_id = w.tenant_id AND s.warehouse_id = w.id
          ) AS totalReservedQuantity,
          (
            SELECT COUNT(*) FROM inventory_movements im
            WHERE im.tenant_id = w.tenant_id AND im.warehouse_id = w.id${this.buildDateOnlyClause('im.created_at', filters).clause}
          ) AS movementCount,
          (
            SELECT COUNT(*) FROM purchase_receipts pr
            WHERE pr.tenant_id = w.tenant_id AND pr.warehouse_id = w.id AND pr.status = 'POSTED'${purchaseMovement.clause}
          ) AS postedReceiptCount,
          (
            SELECT COUNT(*) FROM sales_shipments ss
            WHERE ss.tenant_id = w.tenant_id AND ss.warehouse_id = w.id AND ss.status = 'POSTED'${shipmentMovement.clause}
          ) AS postedShipmentCount,
          (
            SELECT COUNT(*) FROM purchase_returns preturn
            WHERE preturn.tenant_id = w.tenant_id AND preturn.warehouse_id = w.id${purchaseReturnMovement.clause}
          ) AS purchaseReturnCount,
          (
            SELECT COUNT(*) FROM sales_returns sreturn
            WHERE sreturn.tenant_id = w.tenant_id AND sreturn.warehouse_id = w.id${salesReturnMovement.clause}
          ) AS salesReturnCount
        FROM warehouses w
        WHERE w.tenant_id = ? AND w.deleted_at IS NULL${whereClause}
        ORDER BY w.name ASC
      `,
      [
        ...this.buildDateOnlyClause('im.created_at', filters).params,
        ...purchaseMovement.params,
        ...shipmentMovement.params,
        ...purchaseReturnMovement.params,
        ...salesReturnMovement.params,
        ...params,
      ],
    );

    return rows;
  }

  async getWarehouseUtilization(tenantId: string, filters: WarehouseSummaryFilters) {
    const clauses: string[] = [];
    const params: QueryParams = [tenantId];
    if (filters.warehouseId) {
      clauses.push('w.id = ?');
      params.push(filters.warehouseId);
    }
    const whereClause = clauses.length ? ` AND ${clauses.join(' AND ')}` : '';
    const movementDate = this.buildDateOnlyClause('im.created_at', filters);

    const [rows] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          w.id AS warehouseId,
          w.name AS warehouseName,
          (
            SELECT COUNT(*)
            FROM warehouse_zones z
            WHERE z.tenant_id = w.tenant_id AND z.warehouse_id = w.id
          ) AS zoneCount,
          (
            SELECT COUNT(*)
            FROM warehouse_bins b
            INNER JOIN warehouse_zones z ON z.id = b.zone_id
            WHERE z.tenant_id = w.tenant_id AND z.warehouse_id = w.id
          ) AS binCount,
          (
            SELECT COUNT(DISTINCT b.id)
            FROM warehouse_bins b
            INNER JOIN inventory_stocks s ON s.bin_id = b.id AND s.tenant_id = w.tenant_id
            INNER JOIN warehouse_zones z ON z.id = b.zone_id
            WHERE z.warehouse_id = w.id AND s.on_hand_quantity > 0
          ) AS stockedBinCount,
          (
            SELECT COUNT(DISTINCT COALESCE(s.product_variant_id, s.product_id))
            FROM inventory_stocks s
            WHERE s.tenant_id = w.tenant_id AND s.warehouse_id = w.id AND s.on_hand_quantity > 0
          ) AS uniqueStockedItemCount,
          (
            SELECT COUNT(*)
            FROM inventory_movements im
            WHERE im.tenant_id = w.tenant_id AND im.warehouse_id = w.id${movementDate.clause}
          ) AS movementActivityCount
        FROM warehouses w
        WHERE w.tenant_id = ? AND w.deleted_at IS NULL${whereClause}
        ORDER BY movementActivityCount DESC, w.name ASC
      `,
      [...movementDate.params, ...params],
    );

    return rows;
  }

  async getTopSellingProducts(tenantId: string, filters: RankingFilters) {
    const clauses: string[] = [];
    const params: QueryParams = [tenantId];
    if (filters.warehouseId) {
      clauses.push('ss.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    if (filters.customerId) {
      clauses.push('so.customer_id = ?');
      params.push(filters.customerId);
    }
    this.addDateRangeClause(clauses, params, 'ss.shipment_date', filters);
    const whereClause = clauses.length ? ` AND ${clauses.join(' AND ')}` : '';

    const safeLimit = Number.isFinite(Number(filters.limit))
      ? Math.max(1, Math.min(100, Math.trunc(Number(filters.limit))))
      : 10;

    const [rows] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          ssi.product_id AS productId,
          ssi.product_variant_id AS productVariantId,
          COALESCE(p.name, vp.name) AS productName,
          pv.name AS variantName,
          COALESCE(CAST(SUM(ssi.shipped_quantity) AS DOUBLE), 0) AS shippedQuantity,
          COALESCE(CAST(SUM(ssi.shipped_quantity * COALESCE(soi.unit_price, 0)) AS DOUBLE), 0) AS salesAmount
        FROM sales_shipment_items ssi
        INNER JOIN sales_shipments ss ON ss.id = ssi.sales_shipment_id AND ss.tenant_id = ssi.tenant_id
        INNER JOIN sales_orders so ON so.id = ss.sales_order_id AND so.tenant_id = ss.tenant_id
        LEFT JOIN sales_order_items soi ON soi.id = ssi.sales_order_item_id AND soi.tenant_id = ssi.tenant_id
        LEFT JOIN products p ON p.id = ssi.product_id
        LEFT JOIN product_variants pv ON pv.id = ssi.product_variant_id
        LEFT JOIN products vp ON vp.id = pv.product_id
        WHERE ssi.tenant_id = ? AND ss.status = 'POSTED' AND so.status != 'CANCELLED'${whereClause}
        GROUP BY ssi.product_id, ssi.product_variant_id, COALESCE(p.name, vp.name), pv.name
        ORDER BY shippedQuantity DESC, salesAmount DESC, productName ASC
        LIMIT ${safeLimit}
      `,
      params,
    );

    return rows;
  }

  async getTopPurchasedProducts(tenantId: string, filters: RankingFilters) {
    const clauses: string[] = [];
    const params: QueryParams = [tenantId];
    if (filters.warehouseId) {
      clauses.push('pr.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    if (filters.supplierId) {
      clauses.push('pr.supplier_id = ?');
      params.push(filters.supplierId);
    }
    this.addDateRangeClause(clauses, params, 'pr.receipt_date', filters);
    const whereClause = clauses.length ? ` AND ${clauses.join(' AND ')}` : '';

    const safeLimit = Number.isFinite(Number(filters.limit))
      ? Math.max(1, Math.min(100, Math.trunc(Number(filters.limit))))
      : 10;

    const [rows] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          pri.product_id AS productId,
          pri.product_variant_id AS productVariantId,
          COALESCE(p.name, vp.name) AS productName,
          pv.name AS variantName,
          COALESCE(CAST(SUM(pri.received_quantity) AS DOUBLE), 0) AS receivedQuantity,
          COALESCE(CAST(SUM(pri.received_quantity * pri.unit_cost) AS DOUBLE), 0) AS purchaseValue
        FROM purchase_receipt_items pri
        INNER JOIN purchase_receipts pr ON pr.id = pri.purchase_receipt_id AND pr.tenant_id = pri.tenant_id
        LEFT JOIN products p ON p.id = pri.product_id
        LEFT JOIN product_variants pv ON pv.id = pri.product_variant_id
        LEFT JOIN products vp ON vp.id = pv.product_id
        WHERE pri.tenant_id = ? AND pr.status = 'POSTED'${whereClause}
        GROUP BY pri.product_id, pri.product_variant_id, COALESCE(p.name, vp.name), pv.name
        ORDER BY receivedQuantity DESC, purchaseValue DESC, productName ASC
        LIMIT ${safeLimit}
      `,
      params,
    );

    return rows;
  }

  async getNonMovingProducts(tenantId: string, filters: RankingFilters) {
    const stockClauses: string[] = ['s.on_hand_quantity > 0'];
    const stockParams: QueryParams = [tenantId];
    const movementClauses: string[] = [];
    const movementParams: QueryParams = [tenantId];

    if (filters.warehouseId) {
      stockClauses.push('s.warehouse_id = ?');
      stockParams.push(filters.warehouseId);
      movementClauses.push('im.warehouse_id = ?');
      movementParams.push(filters.warehouseId);
    }

    this.addDateRangeClause(movementClauses, movementParams, 'im.created_at', filters);
    const stockWhere = stockClauses.length ? ` AND ${stockClauses.join(' AND ')}` : '';
    const movementWhere = movementClauses.length ? ` AND ${movementClauses.join(' AND ')}` : '';

    const safeLimit = Number.isFinite(Number(filters.limit))
      ? Math.max(1, Math.min(100, Math.trunc(Number(filters.limit))))
      : 10;

    const [rows] = await this.db.execute<SummaryRow[]>(
      `
        SELECT
          s.product_id AS productId,
          s.product_variant_id AS productVariantId,
          COALESCE(p.name, vp.name) AS productName,
          pv.name AS variantName,
          COALESCE(CAST(SUM(s.on_hand_quantity) AS DOUBLE), 0) AS onHandQuantity,
          COALESCE(CAST(SUM(s.available_quantity) AS DOUBLE), 0) AS availableQuantity
        FROM inventory_stocks s
        LEFT JOIN products p ON p.id = s.product_id
        LEFT JOIN product_variants pv ON pv.id = s.product_variant_id
        LEFT JOIN products vp ON vp.id = pv.product_id
        WHERE s.tenant_id = ?${stockWhere}
          AND NOT EXISTS (
            SELECT 1
            FROM inventory_movements im
            WHERE im.tenant_id = ?${movementWhere}
              AND (
                (s.product_id IS NOT NULL AND im.product_id = s.product_id)
                OR
                (s.product_variant_id IS NOT NULL AND im.product_variant_id = s.product_variant_id)
              )
          )
        GROUP BY s.product_id, s.product_variant_id, COALESCE(p.name, vp.name), pv.name
        ORDER BY onHandQuantity DESC, productName ASC
        LIMIT ${safeLimit}
      `,
      [...stockParams, ...movementParams],
    );

    return rows;
  }

  private buildInventoryStockFilter(filters: { warehouseId?: string; productId?: string }) {
    const clauses: string[] = [];
    const params: QueryParams = [];
    if (filters.warehouseId) {
      clauses.push('warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    if (filters.productId) {
      clauses.push('(product_id = ? OR product_variant_id IN (SELECT id FROM product_variants WHERE product_id = ?))');
      params.push(filters.productId, filters.productId);
    }
    return {
      clause: clauses.length ? ` AND ${clauses.join(' AND ')}` : '',
      params,
    };
  }

  private buildInventoryMovementFilter(filters: InventoryMovementSummaryFilters) {
    const clauses: string[] = [];
    const params: QueryParams = [];
    if (filters.warehouseId) {
      clauses.push('warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    if (filters.productId) {
      clauses.push('(product_id = ? OR product_variant_id IN (SELECT id FROM product_variants WHERE product_id = ?))');
      params.push(filters.productId, filters.productId);
    }
    if (filters.movementType) {
      clauses.push('movement_type = ?');
      params.push(filters.movementType);
    }
    if (filters.referenceType) {
      clauses.push('reference_type = ?');
      params.push(filters.referenceType);
    }
    this.addDateRangeClause(clauses, params, 'created_at', filters);
    return {
      clause: clauses.length ? ` AND ${clauses.join(' AND ')}` : '',
      params,
    };
  }

  private buildPurchaseOrderFilter(filters: PurchaseSummaryFilters) {
    const clauses: string[] = [];
    const params: QueryParams = [];
    if (filters.supplierId) {
      clauses.push('po.supplier_id = ?');
      params.push(filters.supplierId);
    }
    if (filters.warehouseId) {
      clauses.push('po.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    if (filters.status) {
      clauses.push('po.status = ?');
      params.push(filters.status);
    }
    this.addDateRangeClause(clauses, params, 'po.order_date', filters);
    return {
      clause: clauses.length ? ` AND ${clauses.join(' AND ')}` : '',
      params,
    };
  }

  private buildPurchaseReceiptFilter(filters: PurchaseSummaryFilters) {
    const clauses: string[] = [];
    const params: QueryParams = [];
    if (filters.supplierId) {
      clauses.push('pr.supplier_id = ?');
      params.push(filters.supplierId);
    }
    if (filters.warehouseId) {
      clauses.push('pr.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    this.addDateRangeClause(clauses, params, 'pr.receipt_date', filters);
    return {
      clause: clauses.length ? ` AND ${clauses.join(' AND ')}` : '',
      params,
    };
  }

  private buildSalesOrderFilter(filters: SalesSummaryFilters) {
    const clauses: string[] = [];
    const params: QueryParams = [];
    if (filters.customerId) {
      clauses.push('so.customer_id = ?');
      params.push(filters.customerId);
    }
    if (filters.warehouseId) {
      clauses.push('so.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    if (filters.status) {
      clauses.push('so.status = ?');
      params.push(filters.status);
    }
    this.addDateRangeClause(clauses, params, 'so.order_date', filters);
    return {
      clause: clauses.length ? ` AND ${clauses.join(' AND ')}` : '',
      params,
    };
  }

  private buildShipmentFilter(filters: SalesSummaryFilters) {
    const clauses: string[] = [];
    const params: QueryParams = [];
    if (filters.warehouseId) {
      clauses.push('ss.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    if (filters.customerId) {
      clauses.push('ss.sales_order_id IN (SELECT id FROM sales_orders WHERE tenant_id = ss.tenant_id AND customer_id = ? AND deleted_at IS NULL AND status != "CANCELLED")');
      params.push(filters.customerId);
    }
    this.addDateRangeClause(clauses, params, 'ss.shipment_date', filters);
    return {
      clause: clauses.length ? ` AND ${clauses.join(' AND ')}` : '',
      params,
    };
  }

  private buildPurchaseReturnFilter(filters: ReturnsSummaryFilters) {
    const clauses: string[] = [];
    const params: QueryParams = [];
    if (filters.warehouseId) {
      clauses.push('pr.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    if (filters.supplierId) {
      clauses.push('pr.supplier_id = ?');
      params.push(filters.supplierId);
    }
    this.addDateRangeClause(clauses, params, 'pr.return_date', filters);
    return {
      clause: clauses.length ? ` AND ${clauses.join(' AND ')}` : '',
      params,
    };
  }

  private buildSalesReturnFilter(filters: ReturnsSummaryFilters) {
    const clauses: string[] = [];
    const params: QueryParams = [];
    if (filters.warehouseId) {
      clauses.push('sr.warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    if (filters.customerId) {
      clauses.push('sr.customer_id = ?');
      params.push(filters.customerId);
    }
    this.addDateRangeClause(clauses, params, 'sr.return_date', filters);
    return {
      clause: clauses.length ? ` AND ${clauses.join(' AND ')}` : '',
      params,
    };
  }

  private addDateRangeClause(
    clauses: string[],
    params: QueryParams,
    column: string,
    filters: { dateFrom?: string; dateTo?: string },
  ) {
    if (filters.dateFrom) {
      clauses.push(`${column} >= ?`);
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      clauses.push(`${column} <= ?`);
      params.push(filters.dateTo);
    }
  }

  private buildDateOnlyClause(column: string, filters: { dateFrom?: string; dateTo?: string }) {
    const clauses: string[] = [];
    const params: QueryParams = [];
    this.addDateRangeClause(clauses, params, column, filters);
    return {
      clause: clauses.length ? ` AND ${clauses.join(' AND ')}` : '',
      params,
    };
  }

  private buildWarehouseDateClause(column: string, filters: DashboardSummaryFilters) {
    const clauses: string[] = [];
    const params: QueryParams = [];
    if (filters.warehouseId) {
      clauses.push('warehouse_id = ?');
      params.push(filters.warehouseId);
    }
    this.addDateRangeClause(clauses, params, column, filters);
    return {
      clause: clauses.length ? ` AND ${clauses.join(' AND ')}` : '',
      params,
    };
  }

  private buildTrendExpressions(column: string, groupBy: TrendGroupBy) {
    switch (groupBy) {
      case 'day':
        return {
          bucketExpression: `DATE(${column})`,
          groupExpression: `DATE(${column})`,
          sortExpression: `DATE(${column})`,
        };
      case 'week':
        return {
          bucketExpression: `YEARWEEK(${column}, 3)`,
          groupExpression: `YEARWEEK(${column}, 3)`,
          sortExpression: `YEARWEEK(${column}, 3)`,
        };
      case 'month':
      default:
        return {
          bucketExpression: `DATE_FORMAT(${column}, '%Y-%m')`,
          groupExpression: `DATE_FORMAT(${column}, '%Y-%m')`,
          sortExpression: `DATE_FORMAT(${column}, '%Y-%m')`,
        };
    }
  }
}
