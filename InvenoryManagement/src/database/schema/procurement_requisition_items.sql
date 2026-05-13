CREATE TABLE IF NOT EXISTS procurement_requisition_items (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  procurement_requisition_id CHAR(36) NOT NULL,
  product_id CHAR(36) DEFAULT NULL,
  product_variant_id CHAR(36) DEFAULT NULL,
  requested_quantity DECIMAL(18, 4) NOT NULL,
  approved_quantity DECIMAL(18, 4) NOT NULL DEFAULT 0,
  estimated_unit_cost DECIMAL(18, 4) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_procurement_requisition_items_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_procurement_requisition_items_requisition
    FOREIGN KEY (procurement_requisition_id) REFERENCES procurement_requisitions(id) ON DELETE CASCADE,
  CONSTRAINT fk_procurement_requisition_items_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_procurement_requisition_items_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  CONSTRAINT chk_procurement_requisition_items_item_presence
    CHECK (
      (product_id IS NOT NULL AND product_variant_id IS NULL)
      OR (product_id IS NULL AND product_variant_id IS NOT NULL)
    ),
  INDEX idx_procurement_requisition_items_tenant_requisition (tenant_id, procurement_requisition_id)
);
