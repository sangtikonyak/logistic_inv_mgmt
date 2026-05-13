CREATE TABLE IF NOT EXISTS warehouse_picklists (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  warehouse_id CHAR(36) NOT NULL,
  picklist_number VARCHAR(80) NOT NULL,
  status ENUM('DRAFT', 'ASSIGNED', 'PICKING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  assigned_to CHAR(36) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_by CHAR(36) DEFAULT NULL,
  updated_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_warehouse_picklists_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_warehouse_picklists_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_warehouse_picklists_assigned
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT uq_warehouse_picklists_tenant_number UNIQUE (tenant_id, picklist_number),
  INDEX idx_warehouse_picklists_tenant_status (tenant_id, status)
);

CREATE TABLE IF NOT EXISTS warehouse_picklist_items (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  picklist_id CHAR(36) NOT NULL,
  reference_type ENUM('SALES_SHIPMENT', 'WAREHOUSE_TRANSFER') NOT NULL,
  reference_id CHAR(36) NOT NULL,
  reference_item_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  product_variant_id CHAR(36) DEFAULT NULL,
  zone_id CHAR(36) DEFAULT NULL,
  bin_id CHAR(36) DEFAULT NULL,
  quantity_requested DECIMAL(18, 4) NOT NULL,
  quantity_picked DECIMAL(18, 4) NOT NULL DEFAULT 0,
  status ENUM('PENDING', 'PARTIAL', 'COMPLETED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_warehouse_picklist_items_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_warehouse_picklist_items_picklist
    FOREIGN KEY (picklist_id) REFERENCES warehouse_picklists(id) ON DELETE CASCADE,
  CONSTRAINT fk_warehouse_picklist_items_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_warehouse_picklist_items_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
  CONSTRAINT fk_warehouse_picklist_items_zone
    FOREIGN KEY (zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
  CONSTRAINT fk_warehouse_picklist_items_bin
    FOREIGN KEY (bin_id) REFERENCES warehouse_bins(id) ON DELETE SET NULL,
  INDEX idx_warehouse_picklist_items_tenant_picklist (tenant_id, picklist_id),
  INDEX idx_warehouse_picklist_items_tenant_reference (tenant_id, reference_type, reference_id)
);
