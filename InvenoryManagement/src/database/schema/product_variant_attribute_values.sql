CREATE TABLE IF NOT EXISTS product_variant_attribute_values (
  variant_id CHAR(36) NOT NULL,
  attribute_id CHAR(36) NOT NULL,
  attribute_value_id CHAR(36) NOT NULL,
  tenant_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (variant_id, attribute_id),
  CONSTRAINT fk_product_variant_attribute_values_variant
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_variant_attribute_values_attribute
    FOREIGN KEY (attribute_id) REFERENCES product_attributes(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_variant_attribute_values_value
    FOREIGN KEY (attribute_value_id) REFERENCES product_attribute_values(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_variant_attribute_values_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_product_variant_attribute_values_tenant_variant (tenant_id, variant_id),
  INDEX idx_product_variant_attribute_values_tenant_attribute (tenant_id, attribute_id)
);
