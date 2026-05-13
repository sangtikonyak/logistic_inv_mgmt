CREATE TABLE IF NOT EXISTS purchase_returns (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  supplier_id CHAR(36) NOT NULL,
  warehouse_id CHAR(36) NOT NULL,
  purchase_order_id CHAR(36) DEFAULT NULL,
  purchase_receipt_id CHAR(36) NOT NULL,
  purchase_return_number VARCHAR(80) NOT NULL,
  return_date DATE NOT NULL,
  status ENUM('DRAFT', 'POSTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  notes TEXT DEFAULT NULL,
  created_by CHAR(36) DEFAULT NULL,
  updated_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_purchase_returns_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchase_returns_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_returns_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_returns_order
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_returns_receipt
    FOREIGN KEY (purchase_receipt_id) REFERENCES purchase_receipts(id) ON DELETE RESTRICT,
  CONSTRAINT uq_purchase_returns_tenant_number UNIQUE (tenant_id, purchase_return_number),
  INDEX idx_purchase_returns_tenant_status (tenant_id, status),
  INDEX idx_purchase_returns_tenant_return_date (tenant_id, return_date),
  INDEX idx_purchase_returns_tenant_supplier (tenant_id, supplier_id),
  INDEX idx_purchase_returns_tenant_warehouse (tenant_id, warehouse_id),
  INDEX idx_purchase_returns_tenant_order (tenant_id, purchase_order_id),
  INDEX idx_purchase_returns_tenant_receipt (tenant_id, purchase_receipt_id)
);
