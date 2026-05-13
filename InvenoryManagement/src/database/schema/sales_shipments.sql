CREATE TABLE IF NOT EXISTS sales_shipments (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  sales_order_id CHAR(36) NOT NULL,
  warehouse_id CHAR(36) NOT NULL,
  shipment_number VARCHAR(80) NOT NULL,
  shipment_date DATE NOT NULL,
  status ENUM('DRAFT', 'POSTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  notes TEXT DEFAULT NULL,
  created_by CHAR(36) DEFAULT NULL,
  updated_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_shipments_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_shipments_order
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_shipments_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  CONSTRAINT uq_sales_shipments_tenant_number UNIQUE (tenant_id, shipment_number),
  INDEX idx_sales_shipments_tenant_order (tenant_id, sales_order_id),
  INDEX idx_sales_shipments_tenant_status (tenant_id, status)
);
