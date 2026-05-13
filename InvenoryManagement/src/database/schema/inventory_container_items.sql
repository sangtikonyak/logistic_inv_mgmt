CREATE TABLE IF NOT EXISTS inventory_container_items (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  container_id CHAR(36) NOT NULL,
  warehouse_id CHAR(36) NOT NULL,
  product_id CHAR(36) DEFAULT NULL,
  product_variant_id CHAR(36) DEFAULT NULL,
  lot_id CHAR(36) DEFAULT NULL,
  quantity DECIMAL(18, 4) NOT NULL,
  unit_of_measure VARCHAR(40) DEFAULT NULL,
  created_by CHAR(36) DEFAULT NULL,
  updated_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_container_items_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_container_items_container
    FOREIGN KEY (container_id) REFERENCES inventory_containers(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_container_items_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_container_items_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_container_items_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_container_items_lot
    FOREIGN KEY (lot_id) REFERENCES inventory_lots(id) ON DELETE SET NULL,
  CONSTRAINT chk_inventory_container_items_item_presence
    CHECK (
      (product_id IS NOT NULL AND product_variant_id IS NULL)
      OR (product_id IS NULL AND product_variant_id IS NOT NULL)
    ),
  INDEX idx_inventory_container_items_tenant_container (tenant_id, container_id),
  INDEX idx_inventory_container_items_tenant_item (tenant_id, product_id, product_variant_id),
  INDEX idx_inventory_container_items_tenant_lot (tenant_id, lot_id)
);
