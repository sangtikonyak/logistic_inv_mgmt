CREATE TABLE IF NOT EXISTS inventory_layer_consumptions (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  inventory_cost_layer_id CHAR(36) NOT NULL,
  reference_type VARCHAR(60) NOT NULL,
  reference_id CHAR(36) NOT NULL,
  consumed_quantity DECIMAL(18, 4) NOT NULL,
  unit_cost DECIMAL(18, 4) NOT NULL,
  created_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_layer_consumptions_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_layer_consumptions_layer
    FOREIGN KEY (inventory_cost_layer_id) REFERENCES inventory_cost_layers(id) ON DELETE CASCADE,
  CONSTRAINT chk_inventory_layer_consumptions_qty_positive CHECK (consumed_quantity > 0),
  INDEX idx_inventory_layer_consumptions_tenant_reference (tenant_id, reference_type, reference_id),
  INDEX idx_inventory_layer_consumptions_tenant_layer (tenant_id, inventory_cost_layer_id)
);
