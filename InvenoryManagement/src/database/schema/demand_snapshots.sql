CREATE TABLE IF NOT EXISTS demand_snapshots (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  warehouse_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  avg_daily_sales_7d DECIMAL(18, 4) NOT NULL DEFAULT 0,
  avg_daily_sales_30d DECIMAL(18, 4) NOT NULL DEFAULT 0,
  trend_factor DECIMAL(18, 4) NOT NULL DEFAULT 0,
  stockout_days_30d INT NOT NULL DEFAULT 0,
  last_sale_date DATE DEFAULT NULL,
  snapshot_date DATE NOT NULL,
  created_by CHAR(36) NOT NULL,
  updated_by CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_demand_snapshots_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_demand_snapshots_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  CONSTRAINT fk_demand_snapshots_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT uq_demand_snapshots_scope UNIQUE (tenant_id, warehouse_id, product_id, snapshot_date),
  INDEX idx_demand_snapshots_tenant_snapshot (tenant_id, snapshot_date),
  INDEX idx_demand_snapshots_tenant_warehouse (tenant_id, warehouse_id),
  INDEX idx_demand_snapshots_tenant_product (tenant_id, product_id)
);
