CREATE TABLE IF NOT EXISTS user_permissions (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  resource ENUM('USERS', 'PRODUCTS', 'WAREHOUSES', 'INVENTORY', 'SUPPLIERS', 'PURCHASES', 'CUSTOMERS', 'SALES', 'RETURNS') NOT NULL,
  action ENUM('CREATE', 'READ', 'UPDATE', 'DELETE', 'ALL') NOT NULL,
  created_by CHAR(36) DEFAULT NULL,
  updated_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_permissions_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_permissions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_user_permissions_unique UNIQUE (tenant_id, user_id, resource, action),
  INDEX idx_user_permissions_tenant_user (tenant_id, user_id),
  INDEX idx_user_permissions_tenant_resource (tenant_id, resource)
);
