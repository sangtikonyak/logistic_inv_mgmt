CREATE TABLE IF NOT EXISTS sales_shipment_items (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  sales_shipment_id CHAR(36) NOT NULL,
  sales_order_item_id CHAR(36) NOT NULL,
  product_id CHAR(36) DEFAULT NULL,
  product_variant_id CHAR(36) DEFAULT NULL,
  bin_id CHAR(36) DEFAULT NULL,
  lot_id CHAR(36) DEFAULT NULL,
  container_id CHAR(36) DEFAULT NULL,
  inventory_cost_layer_id CHAR(36) DEFAULT NULL,
  shipped_quantity DECIMAL(18, 4) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_shipment_items_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_shipment_items_shipment
    FOREIGN KEY (sales_shipment_id) REFERENCES sales_shipments(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_shipment_items_order_item
    FOREIGN KEY (sales_order_item_id) REFERENCES sales_order_items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sales_shipment_items_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_shipment_items_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_shipment_items_bin
    FOREIGN KEY (bin_id) REFERENCES warehouse_bins(id) ON DELETE SET NULL,
  CONSTRAINT fk_sales_shipment_items_lot
    FOREIGN KEY (lot_id) REFERENCES inventory_lots(id) ON DELETE SET NULL,
  CONSTRAINT fk_sales_shipment_items_container
    FOREIGN KEY (container_id) REFERENCES inventory_containers(id) ON DELETE SET NULL,
  CONSTRAINT fk_sales_shipment_items_cost_layer
    FOREIGN KEY (inventory_cost_layer_id) REFERENCES inventory_cost_layers(id) ON DELETE SET NULL,
  CONSTRAINT chk_sales_shipment_items_item_presence
    CHECK (
      (product_id IS NOT NULL AND product_variant_id IS NULL)
      OR (product_id IS NULL AND product_variant_id IS NOT NULL)
    ),
  INDEX idx_sales_shipment_items_tenant_shipment (tenant_id, sales_shipment_id),
  INDEX idx_sales_shipment_items_tenant_order_item (tenant_id, sales_order_item_id),
  INDEX idx_sales_shipment_items_tenant_lot (tenant_id, lot_id),
  INDEX idx_sales_shipment_items_tenant_container (tenant_id, container_id)
);
