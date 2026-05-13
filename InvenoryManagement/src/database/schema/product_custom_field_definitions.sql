CREATE TABLE IF NOT EXISTS product_custom_field_definitions (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  field_key VARCHAR(120) NOT NULL,
  field_type ENUM('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'SELECT', 'MULTI_SELECT') NOT NULL,
  applies_to ENUM('PRODUCT', 'VARIANT', 'BOTH') NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  allowed_values_json JSON DEFAULT NULL,
  validation_rules_json JSON DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_product_custom_field_definitions_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT uq_product_custom_field_definitions_tenant_key UNIQUE (tenant_id, field_key),
  INDEX idx_product_custom_field_definitions_tenant_deleted (tenant_id, deleted_at),
  INDEX idx_product_custom_field_definitions_tenant_scope (tenant_id, applies_to)
);
