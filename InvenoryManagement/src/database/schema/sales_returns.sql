CREATE TABLE IF NOT EXISTS sales_returns (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  customer_id CHAR(36) DEFAULT NULL,
  warehouse_id CHAR(36) NOT NULL,
  sales_order_id CHAR(36) NOT NULL,
  sales_shipment_id CHAR(36) NOT NULL,
  sales_return_number VARCHAR(80) NOT NULL,
  return_date DATE NOT NULL,
  status ENUM('DRAFT', 'POSTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  notes TEXT DEFAULT NULL,
  created_by CHAR(36) DEFAULT NULL,
  updated_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_returns_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_returns_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sales_returns_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sales_returns_order
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sales_returns_shipment
    FOREIGN KEY (sales_shipment_id) REFERENCES sales_shipments(id) ON DELETE RESTRICT,
  CONSTRAINT uq_sales_returns_tenant_number UNIQUE (tenant_id, sales_return_number),
  INDEX idx_sales_returns_tenant_status (tenant_id, status),
  INDEX idx_sales_returns_tenant_return_date (tenant_id, return_date),
  INDEX idx_sales_returns_tenant_customer (tenant_id, customer_id),
  INDEX idx_sales_returns_tenant_warehouse (tenant_id, warehouse_id),
  INDEX idx_sales_returns_tenant_order (tenant_id, sales_order_id),
  INDEX idx_sales_returns_tenant_shipment (tenant_id, sales_shipment_id)
);
