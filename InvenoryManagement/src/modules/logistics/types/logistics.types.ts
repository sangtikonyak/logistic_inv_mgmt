export type CarrierType = '3PL' | 'INTERNAL';
export type CarrierStatus = 'ACTIVE' | 'INACTIVE';

export interface Carrier {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  carrier_type: CarrierType;
  status: CarrierStatus;
  created_at: Date;
  updated_at: Date;
}

export type VehicleStatus = 'AVAILABLE' | 'IN_TRANSIT' | 'MAINTENANCE' | 'RETIRED';

export interface Vehicle {
  id: string;
  tenant_id: string;
  plate_number: string;
  vehicle_type: string | null;
  capacity_weight: string;
  capacity_volume: string;
  status: VehicleStatus;
  created_at: Date;
  updated_at: Date;
}

export type DriverStatus = 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY' | 'INACTIVE';

export interface Driver {
  id: string;
  tenant_id: string;
  user_id: string | null;
  full_name: string;
  license_number: string;
  phone: string | null;
  status: DriverStatus;
  created_at: Date;
  updated_at: Date;
}

export type LogisticsShipmentStatus = 'DRAFT' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'EXCEPTION';
export type DestinationType = 'CUSTOMER' | 'WAREHOUSE';

export interface LogisticsShipment {
  id: string;
  tenant_id: string;
  shipment_number: string;
  carrier_id: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  source_warehouse_id: string;
  destination_type: DestinationType;
  destination_id: string | null;
  destination_address: string | null;
  status: LogisticsShipmentStatus;
  estimated_departure: Date | null;
  actual_departure: Date | null;
  estimated_arrival: Date | null;
  actual_arrival: Date | null;
  tracking_number: string | null;
  pod_signature_url: string | null;
  pod_image_url: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export type ShipmentReferenceType = 'SALES_SHIPMENT' | 'WAREHOUSE_TRANSFER';

export interface LogisticsShipmentItem {
  id: string;
  tenant_id: string;
  logistics_shipment_id: string;
  reference_type: ShipmentReferenceType;
  reference_id: string;
  created_at: Date;
}

export interface CreateLogisticsShipmentInput {
  sourceWarehouseId: string;
  destinationType: DestinationType;
  destinationId?: string | null;
  destinationAddress?: string | null;
  carrierId?: string | null;
  vehicleId?: string | null;
  driverId?: string | null;
  estimatedDeparture?: string;
  estimatedArrival?: string;
  notes?: string | null;
  items: Array<{
    referenceType: ShipmentReferenceType;
    referenceId: string;
  }>;
}
