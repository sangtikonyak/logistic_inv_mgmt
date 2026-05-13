CREATE TABLE IF NOT EXISTS purchase_return_items (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  purchase_return_id CHAR(36) NOT NULL,
  purchase_receipt_item_id CHAR(36) NOT NULL,
  product_id CHAR(36) DEFAULT NULL,
  product_variant_id CHAR(36) DEFAULT NULL,
  bin_id CHAR(36) DEFAULT NULL,
  returned_quantity DECIMAL(18, 4) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_purchase_return_items_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchase_return_items_return
    FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchase_return_items_receipt_item
    FOREIGN KEY (purchase_receipt_item_id) REFERENCES purchase_receipt_items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_return_items_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchase_return_items_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchase_return_items_bin
    FOREIGN KEY (bin_id) REFERENCES warehouse_bins(id) ON DELETE SET NULL,
  CONSTRAINT chk_purchase_return_items_item_presence
    CHECK (
      (product_id IS NOT NULL AND product_variant_id IS NULL)
      OR (product_id IS NULL AND product_variant_id IS NOT NULL)
    ),
  INDEX idx_purchase_return_items_tenant_return (tenant_id, purchase_return_id),
  INDEX idx_purchase_return_items_tenant_receipt_item (tenant_id, purchase_receipt_item_id)
);
