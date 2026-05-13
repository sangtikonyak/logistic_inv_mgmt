CREATE TABLE IF NOT EXISTS product_units (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(80) NOT NULL,
  code VARCHAR(30) NOT NULL,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_product_units_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT uq_product_units_tenant_name UNIQUE (tenant_id, name),
  CONSTRAINT uq_product_units_tenant_code UNIQUE (tenant_id, code),
  INDEX idx_product_units_tenant_deleted (tenant_id, deleted_at)
);
