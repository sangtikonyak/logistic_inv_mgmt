CREATE TABLE IF NOT EXISTS product_attribute_values (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  attribute_id CHAR(36) NOT NULL,
  value VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_attribute_values_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_attribute_values_attribute
    FOREIGN KEY (attribute_id) REFERENCES product_attributes(id) ON DELETE CASCADE,
  CONSTRAINT uq_product_attribute_values_attribute_value UNIQUE (attribute_id, value),
  INDEX idx_product_attribute_values_tenant_attribute (tenant_id, attribute_id)
);
