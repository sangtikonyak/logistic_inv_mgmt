CREATE TABLE IF NOT EXISTS inventory_stocks (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  warehouse_id CHAR(36) NOT NULL,
  zone_id CHAR(36) DEFAULT NULL,
  bin_id CHAR(36) DEFAULT NULL,
  product_id CHAR(36) DEFAULT NULL,
  product_variant_id CHAR(36) DEFAULT NULL,
  on_hand_quantity DECIMAL(18, 4) NOT NULL DEFAULT 0,
  reserved_quantity DECIMAL(18, 4) NOT NULL DEFAULT 0,
  available_quantity DECIMAL(18, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_stocks_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_stocks_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_stocks_zone
    FOREIGN KEY (zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
  CONSTRAINT fk_inventory_stocks_bin
    FOREIGN KEY (bin_id) REFERENCES warehouse_bins(id) ON DELETE SET NULL,
  CONSTRAINT fk_inventory_stocks_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_stocks_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  CONSTRAINT chk_inventory_stocks_item_presence
    CHECK (
      (product_id IS NOT NULL AND product_variant_id IS NULL)
      OR (product_id IS NULL AND product_variant_id IS NOT NULL)
    ),
  CONSTRAINT uq_inventory_stocks_location_item UNIQUE (tenant_id, warehouse_id, bin_id, product_id, product_variant_id),
  INDEX idx_inventory_stocks_tenant_warehouse (tenant_id, warehouse_id),
  INDEX idx_inventory_stocks_tenant_warehouse_zone_bin (tenant_id, warehouse_id, zone_id, bin_id),
  INDEX idx_inventory_stocks_tenant_warehouse_product (tenant_id, warehouse_id, product_id),
  INDEX idx_inventory_stocks_tenant_warehouse_variant (tenant_id, warehouse_id, product_variant_id),
  INDEX idx_inventory_stocks_tenant_product (tenant_id, product_id),
  INDEX idx_inventory_stocks_tenant_variant (tenant_id, product_variant_id)
);
