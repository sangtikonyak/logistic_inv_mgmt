CREATE TABLE IF NOT EXISTS product_category_assignments (
  product_id CHAR(36) NOT NULL,
  category_id CHAR(36) NOT NULL,
  tenant_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id, category_id),
  CONSTRAINT fk_product_category_assignments_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_category_assignments_category
    FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_category_assignments_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_product_category_assignments_tenant_category (tenant_id, category_id),
  INDEX idx_product_category_assignments_tenant_product (tenant_id, product_id)
);
