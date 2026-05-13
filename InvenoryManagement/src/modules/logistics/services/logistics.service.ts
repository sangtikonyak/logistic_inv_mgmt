import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../common/exceptions/app-error';
import { Queryable } from '../../../database/database.types';
import { UnitOfWork } from '../../../database/unit-of-work';
import { LogisticsRepository } from '../repositories/logistics.repository';
import { CreateLogisticsShipmentInput } from '../types/logistics.types';
import { ActivityService } from '../../activity/services/activity.service';

export class LogisticsService {
  private readonly logisticsRepository: LogisticsRepository;

  constructor(
    db: Queryable,
    private readonly unitOfWork: UnitOfWork,
    private readonly activityService: ActivityService
  ) {
    this.logisticsRepository = new LogisticsRepository(db);
  }

  async createLogisticsShipment(tenantId: string, actorUserId: string, input: CreateLogisticsShipmentInput) {
    const shipmentId = uuidv4();
    const shipmentNumber = `LOG-${Date.now()}-${shipmentId.slice(0, 8).toUpperCase()}`;

    await this.unitOfWork.execute(async (transaction) => {
      await this.logisticsRepository.createLogisticsShipment(
        {
          id: shipmentId,
          tenant_id: tenantId,
          shipment_number: shipmentNumber,
          source_warehouse_id: input.sourceWarehouseId,
          destination_type: input.destinationType,
          destination_id: input.destinationId ?? null,
          destination_address: input.destinationAddress ?? null,
          carrier_id: input.carrierId ?? null,
          vehicle_id: input.vehicleId ?? null,
          driver_id: input.driverId ?? null,
          status: 'DRAFT',
          estimated_departure: input.estimatedDeparture ? new Date(input.estimatedDeparture) : null,
          actual_departure: null,
          estimated_arrival: input.estimatedArrival ? new Date(input.estimatedArrival) : null,
          actual_arrival: null,
          tracking_number: null,
          pod_signature_url: null,
          pod_image_url: null,
          notes: input.notes ?? null,
        },
        transaction
      );

      for (const item of input.items) {
        await this.logisticsRepository.createLogisticsShipmentItem(
          {
            id: uuidv4(),
            tenant_id: tenantId,
            logistics_shipment_id: shipmentId,
            reference_type: item.referenceType,
            reference_id: item.referenceId,
          },
          transaction
        );
      }

      await this.activityService.logActivity({
        tenantId,
        userId: actorUserId,
        actionType: 'CREATE',
        module: 'LOGISTICS',
        description: `Created logistics shipment: ${shipmentNumber}`,
        metadata: { shipmentId, shipmentNumber },
      });
    });

    return this.logisticsRepository.findShipmentById(tenantId, shipmentId);
  }

  async dispatchShipment(tenantId: string, actorUserId: string, shipmentId: string) {
    const shipment = await this.logisticsRepository.findShipmentById(tenantId, shipmentId);
    if (!shipment) {
      throw new AppError('Logistics shipment not found.', 404);
    }
    if (shipment.status !== 'DRAFT' && shipment.status !== 'ASSIGNED') {
      throw new AppError('Shipment is already in transit or completed.', 409);
    }

    const actualDeparture = new Date();
    await this.logisticsRepository.updateShipmentDeparture(tenantId, shipmentId, actualDeparture);

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'LOGISTICS',
      description: `Dispatched logistics shipment: ${shipment.shipment_number}`,
      metadata: { shipmentId, actualDeparture },
    });

    return this.logisticsRepository.findShipmentById(tenantId, shipmentId);
  }

  async recordDelivery(
    tenantId: string,
    actorUserId: string,
    shipmentId: string,
    payload: { podSignatureUrl?: string; podImageUrl?: string }
  ) {
    const shipment = await this.logisticsRepository.findShipmentById(tenantId, shipmentId);
    if (!shipment) {
      throw new AppError('Logistics shipment not found.', 404);
    }
    if (shipment.status !== 'IN_TRANSIT') {
      throw new AppError('Only shipments in transit can be marked as delivered.', 409);
    }

    const actualArrival = new Date();
    await this.logisticsRepository.updateShipmentArrival(tenantId, shipmentId, {
      actualArrival,
      podSignatureUrl: payload.podSignatureUrl,
      podImageUrl: payload.podImageUrl,
    });

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'LOGISTICS',
      description: `Recorded delivery for logistics shipment: ${shipment.shipment_number}`,
      metadata: { shipmentId, actualArrival, ...payload },
    });

    return this.logisticsRepository.findShipmentById(tenantId, shipmentId);
  }
}
