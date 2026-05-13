CREATE TABLE IF NOT EXISTS inventory_lots (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  warehouse_id CHAR(36) NOT NULL,
  product_id CHAR(36) DEFAULT NULL,
  product_variant_id CHAR(36) DEFAULT NULL,
  lot_number VARCHAR(120) NOT NULL,
  mfg_date DATE DEFAULT NULL,
  expiry_date DATE DEFAULT NULL,
  best_before_date DATE DEFAULT NULL,
  supplier_id CHAR(36) DEFAULT NULL,
  purchase_receipt_id CHAR(36) DEFAULT NULL,
  status ENUM('ACTIVE', 'QUARANTINED', 'EXPIRED', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
  notes TEXT DEFAULT NULL,
  created_by CHAR(36) DEFAULT NULL,
  updated_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_lots_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_lots_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_lots_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_lots_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_lots_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  CONSTRAINT fk_inventory_lots_receipt
    FOREIGN KEY (purchase_receipt_id) REFERENCES purchase_receipts(id) ON DELETE SET NULL,
  CONSTRAINT chk_inventory_lots_item_presence
    CHECK (
      (product_id IS NOT NULL AND product_variant_id IS NULL)
      OR (product_id IS NULL AND product_variant_id IS NOT NULL)
    ),
  CONSTRAINT uq_inventory_lots_tenant_item_lot UNIQUE (tenant_id, warehouse_id, product_id, product_variant_id, lot_number),
  INDEX idx_inventory_lots_tenant_status_expiry (tenant_id, status, expiry_date),
  INDEX idx_inventory_lots_tenant_warehouse (tenant_id, warehouse_id)
);
