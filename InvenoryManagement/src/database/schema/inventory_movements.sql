CREATE TABLE IF NOT EXISTS inventory_movements (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  warehouse_id CHAR(36) NOT NULL,
  zone_id CHAR(36) DEFAULT NULL,
  bin_id CHAR(36) DEFAULT NULL,
  product_id CHAR(36) DEFAULT NULL,
  product_variant_id CHAR(36) DEFAULT NULL,
  lot_id CHAR(36) DEFAULT NULL,
  container_id CHAR(36) DEFAULT NULL,
  cost_layer_id CHAR(36) DEFAULT NULL,
  movement_type ENUM(
    'OPENING',
    'ADJUSTMENT_IN',
    'ADJUSTMENT_OUT',
    'TRANSFER_OUT',
    'TRANSFER_IN',
    'RECEIPT',
    'ISSUE',
    'RESERVATION',
    'RESERVATION_RELEASE'
  ) NOT NULL,
  reference_type VARCHAR(50) DEFAULT NULL,
  reference_id CHAR(36) DEFAULT NULL,
  quantity DECIMAL(18, 4) NOT NULL,
  notes TEXT DEFAULT NULL,
  created_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_movements_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_movements_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_movements_zone
    FOREIGN KEY (zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
  CONSTRAINT fk_inventory_movements_bin
    FOREIGN KEY (bin_id) REFERENCES warehouse_bins(id) ON DELETE SET NULL,
  CONSTRAINT fk_inventory_movements_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_movements_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_movements_lot
    FOREIGN KEY (lot_id) REFERENCES inventory_lots(id) ON DELETE SET NULL,
  CONSTRAINT fk_inventory_movements_container
    FOREIGN KEY (container_id) REFERENCES inventory_containers(id) ON DELETE SET NULL,
  CONSTRAINT fk_inventory_movements_cost_layer
    FOREIGN KEY (cost_layer_id) REFERENCES inventory_cost_layers(id) ON DELETE SET NULL,
  CONSTRAINT chk_inventory_movements_item_presence
    CHECK (
      (product_id IS NOT NULL AND product_variant_id IS NULL)
      OR (product_id IS NULL AND product_variant_id IS NOT NULL)
    ),
  INDEX idx_inventory_movements_tenant_warehouse (tenant_id, warehouse_id, created_at),
  INDEX idx_inventory_movements_tenant_reference (tenant_id, reference_type, reference_id),
  INDEX idx_inventory_movements_tenant_lot (tenant_id, lot_id, created_at),
  INDEX idx_inventory_movements_tenant_container (tenant_id, container_id, created_at),
  INDEX idx_inventory_movements_tenant_product (tenant_id, product_id, created_at),
  INDEX idx_inventory_movements_tenant_variant (tenant_id, product_variant_id, created_at)
);
