import bcrypt from 'bcrypt';
import { pool } from './mysql';

const ids = {
  tenant: '11111111-1111-1111-1111-111111111111',
  user: '22222222-2222-2222-2222-222222222222',
  warehouse: '33333333-3333-3333-3333-333333333333',
  supplier: '44444444-4444-4444-4444-444444444444',
  customer: '55555555-5555-5555-5555-555555555555',
  unit: '66666666-6666-6666-6666-666666666666',
  productA: '77777777-7777-7777-7777-777777777771',
  productB: '77777777-7777-7777-7777-777777777772',
  stockA: '88888888-8888-8888-8888-888888888881',
  stockB: '88888888-8888-8888-8888-888888888882',
  po: '99999999-9999-9999-9999-999999999991',
  poItemA: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  poItemB: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
  receipt: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  receiptItemA: 'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  receiptItemB: 'cccccccc-cccc-cccc-cccc-ccccccccccc2',
  so: 'dddddddd-dddd-dddd-dddd-ddddddddddd1',
  soItemA: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
  soItemB: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',
  reservation: 'ffffffff-ffff-ffff-ffff-fffffffffff1',
  reservationItemA: '12121212-1212-1212-1212-121212121211',
  shipment: '13131313-1313-1313-1313-131313131311',
  shipmentItemA: '14141414-1414-1414-1414-141414141411',
  purchaseReturn: '15151515-1515-1515-1515-151515151511',
  purchaseReturnItem: '16161616-1616-1616-1616-161616161611',
  salesReturn: '17171717-1717-1717-1717-171717171711',
  salesReturnItem: '18181818-1818-1818-1818-181818181811',
  movement1: '19191919-1919-1919-1919-191919191911',
  movement2: '20202020-2020-2020-2020-202020202021',
  movement3: '21212121-2121-2121-2121-212121212121',
  movement4: '22222222-2222-2222-2222-222222222223',
};

async function seed() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const passwordHash = await bcrypt.hash('Admin@12345', 10);

    await conn.query(
      `
      INSERT INTO tenants (id, name)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
      `,
      [ids.tenant, 'Demo Reporting Tenant'],
    );

    await conn.query(
      `
      INSERT INTO users (id, tenant_id, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, 'ADMIN', 'ACTIVE')
      ON DUPLICATE KEY UPDATE
        tenant_id = VALUES(tenant_id),
        password_hash = VALUES(password_hash),
        role = VALUES(role),
        status = VALUES(status)
      `,
      [ids.user, ids.tenant, 'admin@demo.local', passwordHash],
    );

    await conn.query(
      `
      INSERT INTO product_units (id, tenant_id, name, code, description)
      VALUES (?, ?, 'Each', 'EA', 'Default seeded unit')
      ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)
      `,
      [ids.unit, ids.tenant],
    );

    await conn.query(
      `
      INSERT INTO warehouses (id, tenant_id, name, code, status, is_default)
      VALUES (?, ?, 'Main Warehouse', 'MAIN-WH', 'ACTIVE', TRUE)
      ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status), is_default = VALUES(is_default)
      `,
      [ids.warehouse, ids.tenant],
    );

    await conn.query(
      `
      INSERT INTO suppliers (id, tenant_id, name, code, status)
      VALUES (?, ?, 'Acme Supplier', 'SUP-ACME', 'ACTIVE')
      ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status)
      `,
      [ids.supplier, ids.tenant],
    );

    await conn.query(
      `
      INSERT INTO customers (id, tenant_id, name, code, status)
      VALUES (?, ?, 'Acme Retail Customer', 'CUS-ACME', 'ACTIVE')
      ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status)
      `,
      [ids.customer, ids.tenant],
    );

    await conn.query(
      `
      INSERT INTO products (
        id, tenant_id, unit_id, name, slug, product_type, status, sku, is_sellable, is_purchasable, track_inventory,
        min_stock_level, cost_price, selling_price, currency_code
      )
      VALUES
      (?, ?, ?, 'Widget A', 'widget-a', 'SIMPLE', 'ACTIVE', 'WID-A', TRUE, TRUE, TRUE, 20, 100, 150, 'INR'),
      (?, ?, ?, 'Widget B', 'widget-b', 'SIMPLE', 'ACTIVE', 'WID-B', TRUE, TRUE, TRUE, 10, 120, 180, 'INR')
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        status = VALUES(status),
        min_stock_level = VALUES(min_stock_level),
        cost_price = VALUES(cost_price),
        selling_price = VALUES(selling_price)
      `,
      [ids.productA, ids.tenant, ids.unit, ids.productB, ids.tenant, ids.unit],
    );

    await conn.query(
      `
      INSERT INTO inventory_stocks (
        id, tenant_id, warehouse_id, product_id, on_hand_quantity, available_quantity, reserved_quantity
      )
      VALUES
      (?, ?, ?, ?, 120, 95, 25),
      (?, ?, ?, ?, 80, 70, 10)
      ON DUPLICATE KEY UPDATE
        on_hand_quantity = VALUES(on_hand_quantity),
        available_quantity = VALUES(available_quantity),
        reserved_quantity = VALUES(reserved_quantity)
      `,
      [ids.stockA, ids.tenant, ids.warehouse, ids.productA, ids.stockB, ids.tenant, ids.warehouse, ids.productB],
    );

    await conn.query(
      `
      INSERT INTO purchase_orders (
        id, tenant_id, supplier_id, warehouse_id, purchase_order_number, status, order_date,
        currency_code, subtotal_amount, total_amount
      )
      VALUES (?, ?, ?, ?, 'PO-DEMO-001', 'ISSUED', CURDATE() - INTERVAL 20 DAY, 'INR', 20000, 20000)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        order_date = VALUES(order_date),
        subtotal_amount = VALUES(subtotal_amount),
        total_amount = VALUES(total_amount)
      `,
      [ids.po, ids.tenant, ids.supplier, ids.warehouse],
    );

    await conn.query(
      `
      INSERT INTO purchase_order_items (
        id, tenant_id, purchase_order_id, product_id, ordered_quantity, unit_cost, line_total
      )
      VALUES
      (?, ?, ?, ?, 100, 100, 10000),
      (?, ?, ?, ?, 80, 125, 10000)
      ON DUPLICATE KEY UPDATE
        ordered_quantity = VALUES(ordered_quantity),
        unit_cost = VALUES(unit_cost),
        line_total = VALUES(line_total)
      `,
      [ids.poItemA, ids.tenant, ids.po, ids.productA, ids.poItemB, ids.tenant, ids.po, ids.productB],
    );

    await conn.query(
      `
      INSERT INTO purchase_receipts (
        id, tenant_id, purchase_order_id, supplier_id, warehouse_id, receipt_number, receipt_date, status
      )
      VALUES (?, ?, ?, ?, ?, 'PR-DEMO-001', CURDATE() - INTERVAL 18 DAY, 'POSTED')
      ON DUPLICATE KEY UPDATE
        receipt_date = VALUES(receipt_date),
        status = VALUES(status)
      `,
      [ids.receipt, ids.tenant, ids.po, ids.supplier, ids.warehouse],
    );

    await conn.query(
      `
      INSERT INTO purchase_receipt_items (
        id, tenant_id, purchase_receipt_id, purchase_order_item_id, product_id, received_quantity, unit_cost
      )
      VALUES
      (?, ?, ?, ?, ?, 90, 100),
      (?, ?, ?, ?, ?, 70, 125)
      ON DUPLICATE KEY UPDATE
        received_quantity = VALUES(received_quantity),
        unit_cost = VALUES(unit_cost)
      `,
      [
        ids.receiptItemA,
        ids.tenant,
        ids.receipt,
        ids.poItemA,
        ids.productA,
        ids.receiptItemB,
        ids.tenant,
        ids.receipt,
        ids.poItemB,
        ids.productB,
      ],
    );

    await conn.query(
      `
      INSERT INTO sales_orders (
        id, tenant_id, customer_id, customer_name, warehouse_id, sales_order_number, status, order_date,
        currency_code, subtotal_amount, total_amount
      )
      VALUES (?, ?, ?, 'Acme Retail Customer', ?, 'SO-DEMO-001', 'PARTIALLY_SHIPPED', CURDATE() - INTERVAL 15 DAY, 'INR', 27000, 27000)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        order_date = VALUES(order_date),
        subtotal_amount = VALUES(subtotal_amount),
        total_amount = VALUES(total_amount)
      `,
      [ids.so, ids.tenant, ids.customer, ids.warehouse],
    );

    await conn.query(
      `
      INSERT INTO sales_order_items (
        id, tenant_id, sales_order_id, product_id, ordered_quantity, reserved_quantity, shipped_quantity, unit_price, line_total
      )
      VALUES
      (?, ?, ?, ?, 90, 70, 60, 150, 13500),
      (?, ?, ?, ?, 75, 55, 50, 180, 13500)
      ON DUPLICATE KEY UPDATE
        ordered_quantity = VALUES(ordered_quantity),
        reserved_quantity = VALUES(reserved_quantity),
        shipped_quantity = VALUES(shipped_quantity),
        unit_price = VALUES(unit_price),
        line_total = VALUES(line_total)
      `,
      [ids.soItemA, ids.tenant, ids.so, ids.productA, ids.soItemB, ids.tenant, ids.so, ids.productB],
    );

    await conn.query(
      `
      INSERT INTO sales_reservations (
        id, tenant_id, sales_order_id, warehouse_id, reservation_number, reservation_date, status
      )
      VALUES (?, ?, ?, ?, 'RSV-DEMO-001', CURDATE() - INTERVAL 14 DAY, 'POSTED')
      ON DUPLICATE KEY UPDATE
        reservation_date = VALUES(reservation_date),
        status = VALUES(status)
      `,
      [ids.reservation, ids.tenant, ids.so, ids.warehouse],
    );

    await conn.query(
      `
      INSERT INTO sales_reservation_items (
        id, tenant_id, sales_reservation_id, sales_order_item_id, product_id, reserved_quantity
      )
      VALUES (?, ?, ?, ?, ?, 70)
      ON DUPLICATE KEY UPDATE
        reserved_quantity = VALUES(reserved_quantity)
      `,
      [ids.reservationItemA, ids.tenant, ids.reservation, ids.soItemA, ids.productA],
    );

    await conn.query(
      `
      INSERT INTO sales_shipments (
        id, tenant_id, sales_order_id, warehouse_id, shipment_number, shipment_date, status
      )
      VALUES (?, ?, ?, ?, 'SHP-DEMO-001', CURDATE() - INTERVAL 12 DAY, 'POSTED')
      ON DUPLICATE KEY UPDATE
        shipment_date = VALUES(shipment_date),
        status = VALUES(status)
      `,
      [ids.shipment, ids.tenant, ids.so, ids.warehouse],
    );

    await conn.query(
      `
      INSERT INTO sales_shipment_items (
        id, tenant_id, sales_shipment_id, sales_order_item_id, product_id, shipped_quantity
      )
      VALUES (?, ?, ?, ?, ?, 60)
      ON DUPLICATE KEY UPDATE
        shipped_quantity = VALUES(shipped_quantity)
      `,
      [ids.shipmentItemA, ids.tenant, ids.shipment, ids.soItemA, ids.productA],
    );

    await conn.query(
      `
      INSERT INTO purchase_returns (
        id, tenant_id, supplier_id, warehouse_id, purchase_order_id, purchase_receipt_id,
        purchase_return_number, return_date, status
      )
      VALUES (?, ?, ?, ?, ?, ?, 'PRT-DEMO-001', CURDATE() - INTERVAL 10 DAY, 'POSTED')
      ON DUPLICATE KEY UPDATE
        return_date = VALUES(return_date),
        status = VALUES(status)
      `,
      [ids.purchaseReturn, ids.tenant, ids.supplier, ids.warehouse, ids.po, ids.receipt],
    );

    await conn.query(
      `
      INSERT INTO purchase_return_items (
        id, tenant_id, purchase_return_id, purchase_receipt_item_id, product_id, returned_quantity
      )
      VALUES (?, ?, ?, ?, ?, 8)
      ON DUPLICATE KEY UPDATE
        returned_quantity = VALUES(returned_quantity)
      `,
      [ids.purchaseReturnItem, ids.tenant, ids.purchaseReturn, ids.receiptItemA, ids.productA],
    );

    await conn.query(
      `
      INSERT INTO sales_returns (
        id, tenant_id, customer_id, warehouse_id, sales_order_id, sales_shipment_id,
        sales_return_number, return_date, status
      )
      VALUES (?, ?, ?, ?, ?, ?, 'SRT-DEMO-001', CURDATE() - INTERVAL 8 DAY, 'POSTED')
      ON DUPLICATE KEY UPDATE
        return_date = VALUES(return_date),
        status = VALUES(status)
      `,
      [ids.salesReturn, ids.tenant, ids.customer, ids.warehouse, ids.so, ids.shipment],
    );

    await conn.query(
      `
      INSERT INTO sales_return_items (
        id, tenant_id, sales_return_id, sales_shipment_item_id, product_id, returned_quantity
      )
      VALUES (?, ?, ?, ?, ?, 5)
      ON DUPLICATE KEY UPDATE
        returned_quantity = VALUES(returned_quantity)
      `,
      [ids.salesReturnItem, ids.tenant, ids.salesReturn, ids.shipmentItemA, ids.productA],
    );

    await conn.query(
      `
      INSERT INTO inventory_movements (
        id, tenant_id, warehouse_id, product_id, movement_type, reference_type, reference_id, quantity, created_at
      )
      VALUES
      (?, ?, ?, ?, 'RECEIPT', 'PURCHASE_RECEIPT', ?, 90, NOW() - INTERVAL 18 DAY),
      (?, ?, ?, ?, 'ISSUE', 'SALES_SHIPMENT', ?, 60, NOW() - INTERVAL 12 DAY),
      (?, ?, ?, ?, 'RESERVATION', 'SALES_RESERVATION', ?, 70, NOW() - INTERVAL 14 DAY),
      (?, ?, ?, ?, 'RESERVATION_RELEASE', 'SALES_RESERVATION', ?, 15, NOW() - INTERVAL 11 DAY)
      ON DUPLICATE KEY UPDATE
        quantity = VALUES(quantity),
        created_at = VALUES(created_at)
      `,
      [
        ids.movement1,
        ids.tenant,
        ids.warehouse,
        ids.productA,
        ids.receipt,
        ids.movement2,
        ids.tenant,
        ids.warehouse,
        ids.productA,
        ids.shipment,
        ids.movement3,
        ids.tenant,
        ids.warehouse,
        ids.productA,
        ids.reservation,
        ids.movement4,
        ids.tenant,
        ids.warehouse,
        ids.productA,
        ids.reservation,
      ],
    );

    await conn.commit();
    console.log('Reporting seed complete.');
    console.log('Demo admin login: admin@demo.local / Admin@12345');
  } catch (error) {
    await conn.rollback();
    console.error('Reporting seed failed:', error);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

seed();
