CREATE TABLE IF NOT EXISTS product_bundle_components (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  bundle_product_id CHAR(36) NOT NULL,
  component_product_id CHAR(36) NOT NULL,
  component_variant_id CHAR(36) DEFAULT NULL,
  quantity DECIMAL(18, 4) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_bundle_components_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_bundle_components_bundle
    FOREIGN KEY (bundle_product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_bundle_components_product
    FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_bundle_components_variant
    FOREIGN KEY (component_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  INDEX idx_product_bundle_components_tenant_bundle (tenant_id, bundle_product_id),
  INDEX idx_product_bundle_components_tenant_component_product (tenant_id, component_product_id),
  INDEX idx_product_bundle_components_tenant_component_variant (tenant_id, component_variant_id)
);
