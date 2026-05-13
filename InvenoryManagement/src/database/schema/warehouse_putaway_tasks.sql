CREATE TABLE IF NOT EXISTS warehouse_putaway_tasks (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  warehouse_id CHAR(36) NOT NULL,
  task_number VARCHAR(80) NOT NULL,
  reference_type ENUM('PURCHASE_RECEIPT', 'SALES_RETURN', 'WAREHOUSE_TRANSFER') NOT NULL,
  reference_id CHAR(36) NOT NULL,
  status ENUM('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  assigned_to CHAR(36) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_by CHAR(36) DEFAULT NULL,
  updated_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_warehouse_putaway_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_warehouse_putaway_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_warehouse_putaway_assigned
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT uq_warehouse_putaway_tenant_number UNIQUE (tenant_id, task_number),
  INDEX idx_warehouse_putaway_tenant_status (tenant_id, status)
);

CREATE TABLE IF NOT EXISTS warehouse_putaway_task_items (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  task_id CHAR(36) NOT NULL,
  reference_item_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  product_variant_id CHAR(36) DEFAULT NULL,
  source_zone_id CHAR(36) DEFAULT NULL,
  source_bin_id CHAR(36) DEFAULT NULL,
  target_zone_id CHAR(36) DEFAULT NULL,
  target_bin_id CHAR(36) DEFAULT NULL,
  quantity_expected DECIMAL(18, 4) NOT NULL,
  quantity_putaway DECIMAL(18, 4) NOT NULL DEFAULT 0,
  status ENUM('PENDING', 'PARTIAL', 'COMPLETED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_warehouse_putaway_items_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_warehouse_putaway_items_task
    FOREIGN KEY (task_id) REFERENCES warehouse_putaway_tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_warehouse_putaway_items_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_warehouse_putaway_items_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
  CONSTRAINT fk_warehouse_putaway_items_src_zone
    FOREIGN KEY (source_zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
  CONSTRAINT fk_warehouse_putaway_items_src_bin
    FOREIGN KEY (source_bin_id) REFERENCES warehouse_bins(id) ON DELETE SET NULL,
  CONSTRAINT fk_warehouse_putaway_items_tgt_zone
    FOREIGN KEY (target_zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
  CONSTRAINT fk_warehouse_putaway_items_tgt_bin
    FOREIGN KEY (target_bin_id) REFERENCES warehouse_bins(id) ON DELETE SET NULL,
  INDEX idx_warehouse_putaway_items_tenant_task (tenant_id, task_id)
);
