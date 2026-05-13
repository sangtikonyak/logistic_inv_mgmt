CREATE TABLE IF NOT EXISTS inventory_cost_layers (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  warehouse_id CHAR(36) NOT NULL,
  product_id CHAR(36) DEFAULT NULL,
  product_variant_id CHAR(36) DEFAULT NULL,
  lot_id CHAR(36) DEFAULT NULL,
  container_id CHAR(36) DEFAULT NULL,
  reference_type VARCHAR(60) NOT NULL,
  reference_id CHAR(36) NOT NULL,
  receipt_date DATE NOT NULL,
  qty_received DECIMAL(18, 4) NOT NULL,
  qty_remaining DECIMAL(18, 4) NOT NULL,
  unit_cost DECIMAL(18, 4) NOT NULL,
  landed_cost DECIMAL(18, 4) NOT NULL DEFAULT 0,
  currency_code CHAR(3) DEFAULT NULL,
  created_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_cost_layers_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_cost_layers_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_cost_layers_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_cost_layers_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_cost_layers_lot
    FOREIGN KEY (lot_id) REFERENCES inventory_lots(id) ON DELETE SET NULL,
  CONSTRAINT fk_inventory_cost_layers_container
    FOREIGN KEY (container_id) REFERENCES inventory_containers(id) ON DELETE SET NULL,
  CONSTRAINT chk_inventory_cost_layers_item_presence
    CHECK (
      (product_id IS NOT NULL AND product_variant_id IS NULL)
      OR (product_id IS NULL AND product_variant_id IS NOT NULL)
    ),
  CONSTRAINT chk_inventory_cost_layers_qty_non_negative
    CHECK (qty_received >= 0 AND qty_remaining >= 0),
  INDEX idx_inventory_cost_layers_tenant_item_fifo (tenant_id, warehouse_id, product_id, product_variant_id, receipt_date, created_at),
  INDEX idx_inventory_cost_layers_tenant_lot (tenant_id, lot_id),
  INDEX idx_inventory_cost_layers_tenant_container (tenant_id, container_id)
);
