CREATE TABLE IF NOT EXISTS purchase_receipt_items (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  purchase_receipt_id CHAR(36) NOT NULL,
  purchase_order_item_id CHAR(36) NOT NULL,
  product_id CHAR(36) DEFAULT NULL,
  product_variant_id CHAR(36) DEFAULT NULL,
  bin_id CHAR(36) DEFAULT NULL,
  lot_id CHAR(36) DEFAULT NULL,
  container_id CHAR(36) DEFAULT NULL,
  lot_number VARCHAR(120) DEFAULT NULL,
  container_code VARCHAR(120) DEFAULT NULL,
  expiry_date DATE DEFAULT NULL,
  received_quantity DECIMAL(18, 4) NOT NULL,
  accepted_quantity DECIMAL(18, 4) NOT NULL DEFAULT 0,
  rejected_quantity DECIMAL(18, 4) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(18, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_purchase_receipt_items_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchase_receipt_items_receipt
    FOREIGN KEY (purchase_receipt_id) REFERENCES purchase_receipts(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchase_receipt_items_order_item
    FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_receipt_items_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchase_receipt_items_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchase_receipt_items_bin
    FOREIGN KEY (bin_id) REFERENCES warehouse_bins(id) ON DELETE SET NULL,
  CONSTRAINT fk_purchase_receipt_items_lot
    FOREIGN KEY (lot_id) REFERENCES inventory_lots(id) ON DELETE SET NULL,
  CONSTRAINT fk_purchase_receipt_items_container
    FOREIGN KEY (container_id) REFERENCES inventory_containers(id) ON DELETE SET NULL,
  CONSTRAINT chk_purchase_receipt_items_item_presence
    CHECK (
      (product_id IS NOT NULL AND product_variant_id IS NULL)
      OR (product_id IS NULL AND product_variant_id IS NOT NULL)
    ),
  INDEX idx_purchase_receipt_items_tenant_receipt (tenant_id, purchase_receipt_id),
  INDEX idx_purchase_receipt_items_tenant_order_item (tenant_id, purchase_order_item_id),
  INDEX idx_purchase_receipt_items_tenant_lot (tenant_id, lot_id),
  INDEX idx_purchase_receipt_items_tenant_container (tenant_id, container_id)
);
