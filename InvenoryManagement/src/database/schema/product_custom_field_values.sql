CREATE TABLE IF NOT EXISTS product_custom_field_values (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  definition_id CHAR(36) NOT NULL,
  product_id CHAR(36) DEFAULT NULL,
  variant_id CHAR(36) DEFAULT NULL,
  value_text TEXT DEFAULT NULL,
  value_number DECIMAL(18, 4) DEFAULT NULL,
  value_boolean BOOLEAN DEFAULT NULL,
  value_date DATE DEFAULT NULL,
  value_json JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_custom_field_values_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_custom_field_values_definition
    FOREIGN KEY (definition_id) REFERENCES product_custom_field_definitions(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_custom_field_values_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_custom_field_values_variant
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  CONSTRAINT uq_product_custom_field_values_product UNIQUE (definition_id, product_id),
  CONSTRAINT uq_product_custom_field_values_variant UNIQUE (definition_id, variant_id),
  INDEX idx_product_custom_field_values_tenant_product (tenant_id, product_id),
  INDEX idx_product_custom_field_values_tenant_variant (tenant_id, variant_id),
  INDEX idx_product_custom_field_values_tenant_definition (tenant_id, definition_id)
);
