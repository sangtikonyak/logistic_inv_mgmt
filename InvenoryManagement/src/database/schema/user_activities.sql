CREATE TABLE IF NOT EXISTS user_activities (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  module VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  metadata JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_activities_tenant_created (tenant_id, created_at DESC),
  INDEX idx_user_activities_user (user_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
