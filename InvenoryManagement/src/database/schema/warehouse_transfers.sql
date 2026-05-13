CREATE TABLE IF NOT EXISTS warehouse_transfers (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  transfer_number VARCHAR(80) NOT NULL,
  source_warehouse_id CHAR(36) NOT NULL,
  destination_warehouse_id CHAR(36) NOT NULL,
  status ENUM('DRAFT', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  notes TEXT DEFAULT NULL,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  created_by CHAR(36) DEFAULT NULL,
  updated_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_warehouse_transfers_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_warehouse_transfers_source
    FOREIGN KEY (source_warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  CONSTRAINT fk_warehouse_transfers_destination
    FOREIGN KEY (destination_warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  CONSTRAINT uq_warehouse_transfers_tenant_number UNIQUE (tenant_id, transfer_number),
  INDEX idx_warehouse_transfers_tenant_status (tenant_id, status, created_at),
  INDEX idx_warehouse_transfers_source (tenant_id, source_warehouse_id, created_at),
  INDEX idx_warehouse_transfers_destination (tenant_id, destination_warehouse_id, created_at)
);
