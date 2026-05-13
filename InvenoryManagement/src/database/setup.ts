import fs from 'fs/promises';
import type { RowDataPacket } from 'mysql2/promise';
import path from 'path';
import { pool } from './mysql';

async function executeSqlFile(filePath: string) {
  try {
    console.log(`Executing ${path.basename(filePath)}...`);
    const sql = await fs.readFile(filePath, 'utf-8');
    
    // Split by semicolons in case there are multiple statements (MySQL2 expects single statements by default unless multipleStatements config is true)
    // For simple schema scripts we can just execute the whole block if it is a single statement or use a connection config
    
    // We expect simple CREATE TABLE statements in our SQL files.
    await pool.query(sql);
    console.log(`✅ Successfully executed ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Failed to execute ${path.basename(filePath)}:`, (error as Error).message);
    throw error;
  }
}

async function ensureColumnExists(tableName: string, columnName: string, definition: string) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?
    `,
    [tableName, columnName]
  );

  if (Number((rows[0] as { count?: number } | undefined)?.count ?? 0) === 0) {
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function ensureIndexExists(tableName: string, indexName: string, definition: string) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?
    `,
    [tableName, indexName]
  );

  if (Number((rows[0] as { count?: number } | undefined)?.count ?? 0) === 0) {
    await pool.query(`ALTER TABLE ${tableName} ADD INDEX ${indexName} ${definition}`);
  }
}

async function ensureForeignKeyExists(tableName: string, constraintName: string, definition: string) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.table_constraints
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND constraint_name = ?
        AND constraint_type = 'FOREIGN KEY'
    `,
    [tableName, constraintName]
  );

  if (Number((rows[0] as { count?: number } | undefined)?.count ?? 0) === 0) {
    await pool.query(`ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} ${definition}`);
  }
}

async function upgradeOrderSchemas() {
  await pool.query(`ALTER TABLE sales_orders MODIFY COLUMN customer_id CHAR(36) NULL`);
  await ensureColumnExists('sales_orders', 'customer_name', `VARCHAR(160) NOT NULL DEFAULT ''`);
  await ensureColumnExists('sales_orders', 'payment_type', `VARCHAR(40) NOT NULL DEFAULT 'NOT_APPLICABLE'`);
  await ensureColumnExists('sales_orders', 'payment_status', `VARCHAR(40) NOT NULL DEFAULT 'NOT_APPLICABLE'`);
  await ensureColumnExists('sales_orders', 'payment_mode', `VARCHAR(40) NOT NULL DEFAULT 'NOT_APPLICABLE'`);

  await pool.query(`
    UPDATE sales_orders so
    LEFT JOIN customers c
      ON c.id = so.customer_id
      AND c.tenant_id = so.tenant_id
      AND c.deleted_at IS NULL
    SET so.customer_name = COALESCE(NULLIF(so.customer_name, ''), c.name, 'Walk-in Customer')
    WHERE so.customer_name = '' OR so.customer_name IS NULL
  `);

  await ensureColumnExists('purchase_orders', 'payment_type', `VARCHAR(40) NOT NULL DEFAULT 'NOT_APPLICABLE'`);
  await ensureColumnExists('purchase_orders', 'payment_status', `VARCHAR(40) NOT NULL DEFAULT 'NOT_APPLICABLE'`);
  await ensureColumnExists('purchase_orders', 'payment_mode', `VARCHAR(40) NOT NULL DEFAULT 'NOT_APPLICABLE'`);

  // Phase 1: Procurement Approval & Cost Layering
  await pool.query(`
    ALTER TABLE purchase_orders 
    MODIFY COLUMN status ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED') 
    NOT NULL DEFAULT 'DRAFT'
  `);
  await ensureColumnExists('purchase_order_items', 'procurement_requisition_item_id', 'CHAR(36) DEFAULT NULL');
}

async function upgradeSupplierSchemas() {
  await ensureColumnExists('suppliers', 'tier', "ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM') DEFAULT 'BRONZE'");
  await ensureColumnExists('suppliers', 'rating', 'DECIMAL(3, 2) DEFAULT 0');
  await ensureColumnExists('suppliers', 'vendor_type', "ENUM('MANUFACTURER', 'DISTRIBUTOR', 'WHOLESALER', 'RETAILER', 'SERVICE_PROVIDER') DEFAULT 'WHOLESALER'");
}

async function upgradeProductSchemas() {
  await ensureIndexExists(
    'products',
    'idx_products_tenant_deleted_updated_id',
    '(tenant_id, deleted_at, updated_at, id)'
  );
  await ensureIndexExists(
    'products',
    'idx_products_tenant_deleted_created_id',
    '(tenant_id, deleted_at, created_at, id)'
  );
  await ensureIndexExists(
    'products',
    'idx_products_tenant_deleted_name_id',
    '(tenant_id, deleted_at, name, id)'
  );
  await ensureIndexExists(
    'products',
    'idx_products_tenant_deleted_status_updated_id',
    '(tenant_id, deleted_at, status, updated_at, id)'
  );
  await ensureIndexExists(
    'products',
    'idx_products_tenant_deleted_type_updated_id',
    '(tenant_id, deleted_at, product_type, updated_at, id)'
  );
  await ensureIndexExists(
    'products',
    'idx_products_tenant_deleted_unit_updated_id',
    '(tenant_id, deleted_at, unit_id, updated_at, id)'
  );
}

async function upgradeInventorySchemas() {
  await ensureIndexExists(
    'inventory_stocks',
    'idx_inventory_stocks_tenant_warehouse_zone_bin',
    '(tenant_id, warehouse_id, zone_id, bin_id)'
  );
  await ensureIndexExists(
    'inventory_stocks',
    'idx_inventory_stocks_tenant_warehouse_product',
    '(tenant_id, warehouse_id, product_id)'
  );
  await ensureIndexExists(
    'inventory_stocks',
    'idx_inventory_stocks_tenant_warehouse_variant',
    '(tenant_id, warehouse_id, product_variant_id)'
  );

  await ensureColumnExists('inventory_movements', 'lot_id', 'CHAR(36) NULL');
  await ensureColumnExists('inventory_movements', 'container_id', 'CHAR(36) NULL');
  await ensureColumnExists('inventory_movements', 'cost_layer_id', 'CHAR(36) NULL');
  await ensureIndexExists('inventory_movements', 'idx_inventory_movements_tenant_lot', '(tenant_id, lot_id, created_at)');
  await ensureIndexExists('inventory_movements', 'idx_inventory_movements_tenant_container', '(tenant_id, container_id, created_at)');

  await ensureColumnExists('purchase_receipt_items', 'lot_id', 'CHAR(36) NULL');
  await ensureColumnExists('purchase_receipt_items', 'container_id', 'CHAR(36) NULL');
  await ensureColumnExists('purchase_receipt_items', 'lot_number', 'VARCHAR(120) NULL');
  await ensureColumnExists('purchase_receipt_items', 'container_code', 'VARCHAR(120) NULL');
  await ensureColumnExists('purchase_receipt_items', 'expiry_date', 'DATE NULL');
  await ensureColumnExists('purchase_receipt_items', 'accepted_quantity', 'DECIMAL(18,4) NOT NULL DEFAULT 0');
  await ensureColumnExists('purchase_receipt_items', 'rejected_quantity', 'DECIMAL(18,4) NOT NULL DEFAULT 0');
  await ensureIndexExists('purchase_receipt_items', 'idx_purchase_receipt_items_tenant_lot', '(tenant_id, lot_id)');
  await ensureIndexExists('purchase_receipt_items', 'idx_purchase_receipt_items_tenant_container', '(tenant_id, container_id)');

  await ensureColumnExists('sales_shipment_items', 'lot_id', 'CHAR(36) NULL');
  await ensureColumnExists('sales_shipment_items', 'container_id', 'CHAR(36) NULL');
  await ensureColumnExists('sales_shipment_items', 'inventory_cost_layer_id', 'CHAR(36) NULL');
  await ensureIndexExists('sales_shipment_items', 'idx_sales_shipment_items_tenant_lot', '(tenant_id, lot_id)');
  await ensureIndexExists('sales_shipment_items', 'idx_sales_shipment_items_tenant_container', '(tenant_id, container_id)');

  await ensureForeignKeyExists(
    'purchase_receipt_items',
    'fk_purchase_receipt_items_lot',
    'FOREIGN KEY (lot_id) REFERENCES inventory_lots(id) ON DELETE SET NULL'
  );
  await ensureForeignKeyExists(
    'purchase_receipt_items',
    'fk_purchase_receipt_items_container',
    'FOREIGN KEY (container_id) REFERENCES inventory_containers(id) ON DELETE SET NULL'
  );
  await ensureForeignKeyExists(
    'inventory_movements',
    'fk_inventory_movements_lot',
    'FOREIGN KEY (lot_id) REFERENCES inventory_lots(id) ON DELETE SET NULL'
  );
  await ensureForeignKeyExists(
    'inventory_movements',
    'fk_inventory_movements_container',
    'FOREIGN KEY (container_id) REFERENCES inventory_containers(id) ON DELETE SET NULL'
  );
  await ensureForeignKeyExists(
    'inventory_movements',
    'fk_inventory_movements_cost_layer',
    'FOREIGN KEY (cost_layer_id) REFERENCES inventory_cost_layers(id) ON DELETE SET NULL'
  );
  await ensureForeignKeyExists(
    'sales_shipment_items',
    'fk_sales_shipment_items_lot',
    'FOREIGN KEY (lot_id) REFERENCES inventory_lots(id) ON DELETE SET NULL'
  );
  await ensureForeignKeyExists(
    'sales_shipment_items',
    'fk_sales_shipment_items_container',
    'FOREIGN KEY (container_id) REFERENCES inventory_containers(id) ON DELETE SET NULL'
  );
  await ensureForeignKeyExists(
    'sales_shipment_items',
    'fk_sales_shipment_items_cost_layer',
    'FOREIGN KEY (inventory_cost_layer_id) REFERENCES inventory_cost_layers(id) ON DELETE SET NULL'
  );
}

async function upgradeAuthSchemas() {
  await pool.query(`
    ALTER TABLE users
    MODIFY COLUMN role ENUM('SUPER_ADMIN', 'MANAGER', 'ADMIN', 'STAFF', 'OPERATOR') NOT NULL
  `);
}

async function runSetup() {
  console.log('Starting Database Schema Setup...');

  try {
    // The order is important due to foreign key constraints
    const schemas = [
      'tenants.sql',
      'users.sql',
      'user_permissions.sql',
      'refresh_tokens.sql',
      'product_categories.sql',
      'product_units.sql',
      'products.sql',
      'product_variants.sql',
      'warehouses.sql',
      'warehouse_zones.sql',
      'warehouse_bins.sql',
      'suppliers.sql',
      'purchase_orders.sql',
      'purchase_order_items.sql',
      'purchase_receipts.sql',
      'purchase_receipt_items.sql',
      'purchase_returns.sql',
      'purchase_return_items.sql',
      'inventory_containers.sql',
      'inventory_lots.sql',
      'inventory_container_items.sql',
      'inventory_cost_layers.sql',
      'inventory_layer_consumptions.sql',
      'customers.sql',
      'sales_orders.sql',
      'sales_order_items.sql',
      'sales_reservations.sql',
      'sales_reservation_items.sql',
      'sales_shipments.sql',
      'sales_shipment_items.sql',
      'sales_returns.sql',
      'sales_return_items.sql',
      'procurement_requisitions.sql',
      'procurement_requisition_items.sql',
      'inventory_stocks.sql',
      'inventory_movements.sql',
      'demand_snapshots.sql',
      'warehouse_transfers.sql',
      'warehouse_transfer_items.sql',
      'product_attributes.sql',
      'product_attribute_values.sql',
      'product_variant_attribute_values.sql',
      'product_bundle_components.sql',
      'product_category_assignments.sql',
      'product_custom_field_definitions.sql',
      'product_custom_field_values.sql',
      'user_activities.sql',
      'logistics.sql',
      'finance.sql'
    ];

    for (const schemaFile of schemas) {
      const fullPath = path.join(__dirname, 'schema', schemaFile);
      await executeSqlFile(fullPath);
    }

    await upgradeAuthSchemas();
    await upgradeOrderSchemas();
    await upgradeSupplierSchemas();
    await upgradeProductSchemas();
    await upgradeInventorySchemas();

    console.log('🎉 All tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database setup failed. Ending process.');
    process.exit(1);
  }
}

runSetup();


