CREATE TABLE IF NOT EXISTS procurement_requisitions (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  requisition_number VARCHAR(80) NOT NULL,
  warehouse_id CHAR(36) NOT NULL,
  requested_by CHAR(36) NOT NULL,
  status ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  required_by_date DATE DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  submitted_at TIMESTAMP NULL DEFAULT NULL,
  approved_at TIMESTAMP NULL DEFAULT NULL,
  rejected_at TIMESTAMP NULL DEFAULT NULL,
  cancelled_at TIMESTAMP NULL DEFAULT NULL,
  created_by CHAR(36) DEFAULT NULL,
  updated_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_procurement_requisitions_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_procurement_requisitions_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_procurement_requisitions_requested_by
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT uq_procurement_requisitions_tenant_number UNIQUE (tenant_id, requisition_number),
  INDEX idx_procurement_requisitions_tenant_status (tenant_id, status),
  INDEX idx_procurement_requisitions_tenant_warehouse (tenant_id, warehouse_id)
);
