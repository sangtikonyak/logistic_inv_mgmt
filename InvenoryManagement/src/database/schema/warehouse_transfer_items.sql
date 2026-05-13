CREATE TABLE IF NOT EXISTS warehouse_transfer_items (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  transfer_id CHAR(36) NOT NULL,
  product_id CHAR(36) DEFAULT NULL,
  product_variant_id CHAR(36) DEFAULT NULL,
  quantity DECIMAL(18, 4) NOT NULL,
  source_bin_id CHAR(36) DEFAULT NULL,
  destination_bin_id CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_warehouse_transfer_items_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_warehouse_transfer_items_transfer
    FOREIGN KEY (transfer_id) REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
  CONSTRAINT fk_warehouse_transfer_items_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_warehouse_transfer_items_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_warehouse_transfer_items_source_bin
    FOREIGN KEY (source_bin_id) REFERENCES warehouse_bins(id) ON DELETE SET NULL,
  CONSTRAINT fk_warehouse_transfer_items_destination_bin
    FOREIGN KEY (destination_bin_id) REFERENCES warehouse_bins(id) ON DELETE SET NULL,
  CONSTRAINT chk_warehouse_transfer_items_item_presence
    CHECK (
      (product_id IS NOT NULL AND product_variant_id IS NULL)
      OR (product_id IS NULL AND product_variant_id IS NOT NULL)
    ),
  INDEX idx_warehouse_transfer_items_transfer (transfer_id),
  INDEX idx_warehouse_transfer_items_tenant_product (tenant_id, product_id),
  INDEX idx_warehouse_transfer_items_tenant_variant (tenant_id, product_variant_id)
);
