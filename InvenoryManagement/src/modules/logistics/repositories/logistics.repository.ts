import mysql from 'mysql2/promise';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import {
  Carrier,
  Driver,
  LogisticsShipment,
  LogisticsShipmentItem,
  Vehicle,
} from '../types/logistics.types';

export class LogisticsRepository {
  constructor(private readonly executor: Queryable) {}

  async createCarrier(carrier: Carrier, executor: Queryable | DatabaseTransaction = this.executor) {
    const sql = `
      INSERT INTO logistics_carriers (id, tenant_id, name, code, contact_person, email, phone, carrier_type, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      carrier.id,
      carrier.tenant_id,
      carrier.name,
      carrier.code,
      carrier.contact_person,
      carrier.email,
      carrier.phone,
      carrier.carrier_type,
      carrier.status,
    ]);
  }

  async createVehicle(vehicle: Vehicle, executor: Queryable | DatabaseTransaction = this.executor) {
    const sql = `
      INSERT INTO logistics_vehicles (id, tenant_id, plate_number, vehicle_type, capacity_weight, capacity_volume, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      vehicle.id,
      vehicle.tenant_id,
      vehicle.plate_number,
      vehicle.vehicle_type,
      vehicle.capacity_weight,
      vehicle.capacity_volume,
      vehicle.status,
    ]);
  }

  async createDriver(driver: Driver, executor: Queryable | DatabaseTransaction = this.executor) {
    const sql = `
      INSERT INTO logistics_drivers (id, tenant_id, user_id, full_name, license_number, phone, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      driver.id,
      driver.tenant_id,
      driver.user_id,
      driver.full_name,
      driver.license_number,
      driver.phone,
      driver.status,
    ]);
  }

  async createLogisticsShipment(shipment: Omit<LogisticsShipment, 'created_at' | 'updated_at'>, executor: Queryable | DatabaseTransaction = this.executor) {
    const sql = `
      INSERT INTO logistics_shipments (
        id, tenant_id, shipment_number, carrier_id, vehicle_id, driver_id, source_warehouse_id,
        destination_type, destination_id, destination_address, status, estimated_departure, estimated_arrival, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      shipment.id,
      shipment.tenant_id,
      shipment.shipment_number,
      shipment.carrier_id,
      shipment.vehicle_id,
      shipment.driver_id,
      shipment.source_warehouse_id,
      shipment.destination_type,
      shipment.destination_id,
      shipment.destination_address,
      shipment.status,
      shipment.estimated_departure,
      shipment.estimated_arrival,
      shipment.notes,
    ]);
  }

  async createLogisticsShipmentItem(item: Omit<LogisticsShipmentItem, 'created_at'>, executor: Queryable | DatabaseTransaction = this.executor) {
    const sql = `
      INSERT INTO logistics_shipment_items (id, tenant_id, logistics_shipment_id, reference_type, reference_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      item.id,
      item.tenant_id,
      item.logistics_shipment_id,
      item.reference_type,
      item.reference_id,
    ]);
  }

  async updateShipmentStatus(tenantId: string, shipmentId: string, status: string, executor: Queryable | DatabaseTransaction = this.executor) {
    const sql = `UPDATE logistics_shipments SET status = ? WHERE tenant_id = ? AND id = ?`;
    await executor.execute<mysql.ResultSetHeader>(sql, [status, tenantId, shipmentId]);
  }

  async updateShipmentDeparture(tenantId: string, shipmentId: string, actualDeparture: Date, executor: Queryable | DatabaseTransaction = this.executor) {
    const sql = `UPDATE logistics_shipments SET actual_departure = ?, status = 'IN_TRANSIT' WHERE tenant_id = ? AND id = ?`;
    await executor.execute<mysql.ResultSetHeader>(sql, [actualDeparture, tenantId, shipmentId]);
  }

  async updateShipmentArrival(tenantId: string, shipmentId: string, payload: { actualArrival: Date; podSignatureUrl?: string; podImageUrl?: string }, executor: Queryable | DatabaseTransaction = this.executor) {
    const sql = `
      UPDATE logistics_shipments
      SET actual_arrival = ?, pod_signature_url = ?, pod_image_url = ?, status = 'DELIVERED'
      WHERE tenant_id = ? AND id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.actualArrival,
      payload.podSignatureUrl ?? null,
      payload.podImageUrl ?? null,
      tenantId,
      shipmentId,
    ]);
  }

  async findShipmentById(tenantId: string, shipmentId: string, executor: Queryable | DatabaseTransaction = this.executor): Promise<LogisticsShipment | null> {
    const sql = `SELECT * FROM logistics_shipments WHERE tenant_id = ? AND id = ?`;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, shipmentId]);
    return (rows as LogisticsShipment[])[0] ?? null;
  }
}
