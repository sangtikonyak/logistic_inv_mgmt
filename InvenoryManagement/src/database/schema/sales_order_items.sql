CREATE TABLE IF NOT EXISTS sales_order_items (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  sales_order_id CHAR(36) NOT NULL,
  product_id CHAR(36) DEFAULT NULL,
  product_variant_id CHAR(36) DEFAULT NULL,
  ordered_quantity DECIMAL(18, 4) NOT NULL,
  reserved_quantity DECIMAL(18, 4) NOT NULL DEFAULT 0,
  shipped_quantity DECIMAL(18, 4) NOT NULL DEFAULT 0,
  unit_price DECIMAL(18, 4) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(18, 4) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(18, 4) NOT NULL DEFAULT 0,
  line_total DECIMAL(18, 4) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_order_items_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_order_items_order
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_order_items_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_order_items_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  CONSTRAINT chk_sales_order_items_item_presence
    CHECK (
      (product_id IS NOT NULL AND product_variant_id IS NULL)
      OR (product_id IS NULL AND product_variant_id IS NOT NULL)
    ),
  INDEX idx_sales_order_items_tenant_order (tenant_id, sales_order_id),
  INDEX idx_sales_order_items_tenant_product (tenant_id, product_id),
  INDEX idx_sales_order_items_tenant_variant (tenant_id, product_variant_id)
);
