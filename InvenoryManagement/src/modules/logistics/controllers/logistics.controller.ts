import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../../common/response/api-response';
import { LogisticsService } from '../services/logistics.service';
import { CreateLogisticsShipmentInput } from '../types/logistics.types';
import { z } from 'zod';

const createShipmentSchema = z.object({
  body: z.object({
    sourceWarehouseId: z.string().uuid(),
    destinationType: z.enum(['CUSTOMER', 'WAREHOUSE']),
    destinationId: z.string().uuid().optional().nullable(),
    destinationAddress: z.string().optional().nullable(),
    carrierId: z.string().uuid().optional().nullable(),
    vehicleId: z.string().uuid().optional().nullable(),
    driverId: z.string().uuid().optional().nullable(),
    estimatedDeparture: z.string().datetime().optional(),
    estimatedArrival: z.string().datetime().optional(),
    notes: z.string().optional().nullable(),
    items: z.array(z.object({
      referenceType: z.enum(['SALES_SHIPMENT', 'WAREHOUSE_TRANSFER']),
      referenceId: z.string().uuid(),
    })).min(1),
  }),
});

const shipmentIdParamSchema = z.object({
  params: z.object({
    shipmentId: z.string().uuid(),
  }),
});

const recordDeliverySchema = z.object({
  params: z.object({
    shipmentId: z.string().uuid(),
  }),
  body: z.object({
    podSignatureUrl: z.string().url().optional(),
    podImageUrl: z.string().url().optional(),
  }),
});

export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  createShipment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createShipmentSchema.parse(req);
      const result = await this.logisticsService.createLogisticsShipment(
        req.user!.tenantId,
        req.user!.userId,
        validated.body
      );
      res.status(201).json(ApiResponse.success(result, 'Logistics shipment created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  dispatchShipment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = shipmentIdParamSchema.parse(req);
      const result = await this.logisticsService.dispatchShipment(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.shipmentId
      );
      res.status(200).json(ApiResponse.success(result, 'Shipment dispatched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  recordDelivery = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = recordDeliverySchema.parse(req);
      const result = await this.logisticsService.recordDelivery(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.shipmentId,
        validated.body
      );
      res.status(200).json(ApiResponse.success(result, 'Delivery recorded successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
