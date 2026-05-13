CREATE TABLE IF NOT EXISTS product_categories (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  parent_category_id CHAR(36) DEFAULT NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(150) NOT NULL,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_product_categories_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_categories_parent
    FOREIGN KEY (parent_category_id) REFERENCES product_categories(id) ON DELETE SET NULL,
  CONSTRAINT uq_product_categories_tenant_slug UNIQUE (tenant_id, slug),
  INDEX idx_product_categories_tenant_deleted (tenant_id, deleted_at),
  INDEX idx_product_categories_tenant_parent (tenant_id, parent_category_id),
  INDEX idx_product_categories_tenant_name (tenant_id, name)
);
