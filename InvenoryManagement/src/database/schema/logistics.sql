CREATE TABLE IF NOT EXISTS logistics_carriers (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  code VARCHAR(60) NOT NULL,
  contact_person VARCHAR(120) DEFAULT NULL,
  email VARCHAR(190) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  carrier_type ENUM('3PL', 'INTERNAL') NOT NULL DEFAULT '3PL',
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_logistics_carriers_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT uq_logistics_carriers_tenant_code UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS logistics_vehicles (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  plate_number VARCHAR(20) NOT NULL,
  vehicle_type VARCHAR(60) DEFAULT NULL,
  capacity_weight DECIMAL(15, 4) DEFAULT 0,
  capacity_volume DECIMAL(15, 4) DEFAULT 0,
  status ENUM('AVAILABLE', 'IN_TRANSIT', 'MAINTENANCE', 'RETIRED') NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_logistics_vehicles_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT uq_logistics_vehicles_tenant_plate UNIQUE (tenant_id, plate_number)
);

CREATE TABLE IF NOT EXISTS logistics_drivers (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36) DEFAULT NULL,
  full_name VARCHAR(160) NOT NULL,
  license_number VARCHAR(60) NOT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  status ENUM('AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'INACTIVE') NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_logistics_drivers_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_logistics_drivers_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT uq_logistics_drivers_tenant_license UNIQUE (tenant_id, license_number)
);

CREATE TABLE IF NOT EXISTS logistics_shipments (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  shipment_number VARCHAR(80) NOT NULL,
  carrier_id CHAR(36) DEFAULT NULL,
  vehicle_id CHAR(36) DEFAULT NULL,
  driver_id CHAR(36) DEFAULT NULL,
  source_warehouse_id CHAR(36) NOT NULL,
  destination_type ENUM('CUSTOMER', 'WAREHOUSE') NOT NULL,
  destination_id CHAR(36) DEFAULT NULL,
  destination_address TEXT DEFAULT NULL,
  status ENUM('DRAFT', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'EXCEPTION') NOT NULL DEFAULT 'DRAFT',
  estimated_departure TIMESTAMP NULL DEFAULT NULL,
  actual_departure TIMESTAMP NULL DEFAULT NULL,
  estimated_arrival TIMESTAMP NULL DEFAULT NULL,
  actual_arrival TIMESTAMP NULL DEFAULT NULL,
  tracking_number VARCHAR(100) DEFAULT NULL,
  pod_signature_url TEXT DEFAULT NULL,
  pod_image_url TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_logistics_shipments_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_logistics_shipments_carrier
    FOREIGN KEY (carrier_id) REFERENCES logistics_carriers(id),
  CONSTRAINT fk_logistics_shipments_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES logistics_vehicles(id),
  CONSTRAINT fk_logistics_shipments_driver
    FOREIGN KEY (driver_id) REFERENCES logistics_drivers(id),
  CONSTRAINT uq_logistics_shipments_tenant_number UNIQUE (tenant_id, shipment_number)
);

CREATE TABLE IF NOT EXISTS logistics_shipment_items (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  logistics_shipment_id CHAR(36) NOT NULL,
  reference_type ENUM('SALES_SHIPMENT', 'WAREHOUSE_TRANSFER') NOT NULL,
  reference_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_log_ship_items_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_log_ship_items_shipment
    FOREIGN KEY (logistics_shipment_id) REFERENCES logistics_shipments(id) ON DELETE CASCADE
);
