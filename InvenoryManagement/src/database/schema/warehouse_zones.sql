CREATE TABLE IF NOT EXISTS warehouse_zones (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  warehouse_id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  code VARCHAR(60) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by CHAR(36) DEFAULT NULL,
  updated_by CHAR(36) DEFAULT NULL,
  deleted_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_warehouse_zones_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_warehouse_zones_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  CONSTRAINT uq_warehouse_zones_scope_code UNIQUE (tenant_id, warehouse_id, code),
  INDEX idx_warehouse_zones_tenant_deleted (tenant_id, deleted_at),
  INDEX idx_warehouse_zones_warehouse_deleted (warehouse_id, deleted_at),
  INDEX idx_warehouse_zones_tenant_name (tenant_id, name)
);
