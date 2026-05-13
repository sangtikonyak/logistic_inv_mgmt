CREATE TABLE IF NOT EXISTS inventory_containers (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  warehouse_id CHAR(36) NOT NULL,
  zone_id CHAR(36) DEFAULT NULL,
  bin_id CHAR(36) DEFAULT NULL,
  parent_container_id CHAR(36) DEFAULT NULL,
  container_code VARCHAR(120) NOT NULL,
  container_type ENUM('BOX', 'CARTON', 'PALLET', 'TOTE', 'OTHER') NOT NULL DEFAULT 'BOX',
  status ENUM('ACTIVE', 'SEALED', 'MOVED', 'DISPATCHED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  notes TEXT DEFAULT NULL,
  created_by CHAR(36) DEFAULT NULL,
  updated_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_containers_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_containers_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_containers_zone
    FOREIGN KEY (zone_id) REFERENCES warehouse_zones(id) ON DELETE SET NULL,
  CONSTRAINT fk_inventory_containers_bin
    FOREIGN KEY (bin_id) REFERENCES warehouse_bins(id) ON DELETE SET NULL,
  CONSTRAINT fk_inventory_containers_parent
    FOREIGN KEY (parent_container_id) REFERENCES inventory_containers(id) ON DELETE SET NULL,
  CONSTRAINT uq_inventory_containers_tenant_code UNIQUE (tenant_id, container_code),
  INDEX idx_inventory_containers_tenant_warehouse (tenant_id, warehouse_id),
  INDEX idx_inventory_containers_tenant_bin (tenant_id, bin_id),
  INDEX idx_inventory_containers_tenant_status (tenant_id, status)
);
