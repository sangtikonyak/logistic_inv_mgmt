CREATE TABLE IF NOT EXISTS inventory_count_plans (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  warehouse_id CHAR(36) NOT NULL,
  plan_number VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  status ENUM('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  count_type ENUM('FULL', 'CYCLE', 'SPOT') NOT NULL DEFAULT 'CYCLE',
  created_by CHAR(36) DEFAULT NULL,
  updated_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_count_plans_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_count_plans_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  CONSTRAINT uq_count_plans_tenant_number UNIQUE (tenant_id, plan_number),
  INDEX idx_count_plans_tenant_status (tenant_id, status)
);

CREATE TABLE IF NOT EXISTS inventory_count_tasks (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  plan_id CHAR(36) NOT NULL,
  bin_id CHAR(36) NOT NULL,
  status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  assigned_to CHAR(36) DEFAULT NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_count_tasks_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_count_tasks_plan
    FOREIGN KEY (plan_id) REFERENCES inventory_count_plans(id) ON DELETE CASCADE,
  CONSTRAINT fk_count_tasks_bin
    FOREIGN KEY (bin_id) REFERENCES warehouse_bins(id) ON DELETE RESTRICT,
  CONSTRAINT fk_count_tasks_assigned
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_count_tasks_tenant_plan (tenant_id, plan_id),
  INDEX idx_count_tasks_tenant_bin (tenant_id, bin_id)
);

CREATE TABLE IF NOT EXISTS inventory_count_items (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  task_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  product_variant_id CHAR(36) DEFAULT NULL,
  expected_quantity DECIMAL(18, 4) NOT NULL,
  counted_quantity DECIMAL(18, 4) DEFAULT NULL,
  discrepancy_quantity DECIMAL(18, 4) DEFAULT NULL,
  reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  reconciled_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_count_items_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_count_items_task
    FOREIGN KEY (task_id) REFERENCES inventory_count_tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_count_items_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_count_items_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
  INDEX idx_count_items_tenant_task (tenant_id, task_id)
);
