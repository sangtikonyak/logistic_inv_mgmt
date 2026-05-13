CREATE TABLE IF NOT EXISTS product_variants (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  unit_id CHAR(36) DEFAULT NULL,
  name VARCHAR(160) NOT NULL,
  sku VARCHAR(80) DEFAULT NULL,
  barcode VARCHAR(80) DEFAULT NULL,
  cost_price DECIMAL(18, 4) DEFAULT NULL,
  selling_price DECIMAL(18, 4) DEFAULT NULL,
  currency_code CHAR(3) DEFAULT NULL,
  attributes_json JSON NOT NULL,
  attribute_signature VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_product_variants_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_variants_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_variants_unit
    FOREIGN KEY (unit_id) REFERENCES product_units(id) ON DELETE SET NULL,
  CONSTRAINT uq_product_variants_tenant_sku UNIQUE (tenant_id, sku),
  CONSTRAINT uq_product_variants_tenant_barcode UNIQUE (tenant_id, barcode),
  CONSTRAINT uq_product_variants_product_signature UNIQUE (product_id, attribute_signature),
  INDEX idx_product_variants_tenant_deleted (tenant_id, deleted_at),
  INDEX idx_product_variants_product_deleted (product_id, deleted_at),
  INDEX idx_product_variants_tenant_name (tenant_id, name),
  INDEX idx_product_variants_tenant_signature (tenant_id, attribute_signature)
);
