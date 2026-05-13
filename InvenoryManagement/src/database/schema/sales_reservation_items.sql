CREATE TABLE IF NOT EXISTS sales_reservation_items (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  sales_reservation_id CHAR(36) NOT NULL,
  sales_order_item_id CHAR(36) NOT NULL,
  product_id CHAR(36) DEFAULT NULL,
  product_variant_id CHAR(36) DEFAULT NULL,
  bin_id CHAR(36) DEFAULT NULL,
  reserved_quantity DECIMAL(18, 4) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_reservation_items_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_reservation_items_reservation
    FOREIGN KEY (sales_reservation_id) REFERENCES sales_reservations(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_reservation_items_order_item
    FOREIGN KEY (sales_order_item_id) REFERENCES sales_order_items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sales_reservation_items_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_reservation_items_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_reservation_items_bin
    FOREIGN KEY (bin_id) REFERENCES warehouse_bins(id) ON DELETE SET NULL,
  CONSTRAINT chk_sales_reservation_items_item_presence
    CHECK (
      (product_id IS NOT NULL AND product_variant_id IS NULL)
      OR (product_id IS NULL AND product_variant_id IS NOT NULL)
    ),
  INDEX idx_sales_reservation_items_tenant_reservation (tenant_id, sales_reservation_id),
  INDEX idx_sales_reservation_items_tenant_order_item (tenant_id, sales_order_item_id)
);
