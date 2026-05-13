import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../../common/response/api-response';
import {
  createSalesOrderSchema,
  createSalesReservationSchema,
  createSalesShipmentSchema,
  listSalesOrdersSchema,
  listSalesReservationsSchema,
  listSalesShipmentsSchema,
  reservationIdParamSchema,
  salesOrderIdParamSchema,
  shipmentIdParamSchema,
  updateSalesOrderSchema,
} from '../dtos/sales.schema';
import { SalesModuleDependencies } from '../sales.module';
import { SalesService } from '../services/sales.service';

export class SalesController {
  private readonly salesService: SalesService;

  constructor(dependencies: SalesModuleDependencies) {
    this.salesService = new SalesService(dependencies.db, dependencies.unitOfWork, dependencies.activityService);
  }

  createSalesOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createSalesOrderSchema.parse(req);
      const result = await this.salesService.createSalesOrder(req.user!.tenantId, req.user!.userId, validated.body);
      res.status(201).json(ApiResponse.success(result, 'Sales order created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  updateSalesOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateSalesOrderSchema.parse(req);
      const result = await this.salesService.updateSalesOrder(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.salesOrderId,
        validated.body
      );
      res.status(200).json(ApiResponse.success(result, 'Sales order updated successfully.'));
    } catch (error) {
      next(error);
    }
  };

  confirmSalesOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = salesOrderIdParamSchema.parse(req);
      const result = await this.salesService.confirmSalesOrder(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.salesOrderId
      );
      res.status(200).json(ApiResponse.success(result, 'Sales order confirmed successfully.'));
    } catch (error) {
      next(error);
    }
  };

  cancelSalesOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = salesOrderIdParamSchema.parse(req);
      const result = await this.salesService.cancelSalesOrder(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.salesOrderId
      );
      res.status(200).json(ApiResponse.success(result, 'Sales order cancelled successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listSalesOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = listSalesOrdersSchema.parse(req);
      const result = await this.salesService.listSalesOrders(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Sales orders fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getSalesOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = salesOrderIdParamSchema.parse(req);
      const result = await this.salesService.getSalesOrderById(req.user!.tenantId, validated.params.salesOrderId);
      res.status(200).json(ApiResponse.success(result, 'Sales order fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  createSalesReservation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createSalesReservationSchema.parse(req);
      const result = await this.salesService.createSalesReservation(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.salesOrderId,
        validated.body
      );
      res.status(201).json(ApiResponse.success(result, 'Sales reservation created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listSalesReservations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = listSalesReservationsSchema.parse(req);
      const result = await this.salesService.listSalesReservations(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Sales reservations fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getSalesReservationById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = reservationIdParamSchema.parse(req);
      const result = await this.salesService.getSalesReservationById(
        req.user!.tenantId,
        validated.params.reservationId
      );
      res.status(200).json(ApiResponse.success(result, 'Sales reservation fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  postSalesReservation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = reservationIdParamSchema.parse(req);
      const result = await this.salesService.postSalesReservation(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.reservationId
      );
      res.status(200).json(ApiResponse.success(result, 'Sales reservation posted successfully.'));
    } catch (error) {
      next(error);
    }
  };

  releaseSalesReservation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = reservationIdParamSchema.parse(req);
      const result = await this.salesService.releaseSalesReservation(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.reservationId
      );
      res.status(200).json(ApiResponse.success(result, 'Sales reservation released successfully.'));
    } catch (error) {
      next(error);
    }
  };

  cancelSalesReservation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = reservationIdParamSchema.parse(req);
      const result = await this.salesService.cancelSalesReservation(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.reservationId
      );
      res.status(200).json(ApiResponse.success(result, 'Sales reservation cancelled successfully.'));
    } catch (error) {
      next(error);
    }
  };

  createSalesShipment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createSalesShipmentSchema.parse(req);
      const result = await this.salesService.createSalesShipment(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.salesOrderId,
        validated.body
      );
      res.status(201).json(ApiResponse.success(result, 'Sales shipment created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listSalesShipments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = listSalesShipmentsSchema.parse(req);
      const result = await this.salesService.listSalesShipments(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Sales shipments fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getSalesShipmentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = shipmentIdParamSchema.parse(req);
      const result = await this.salesService.getSalesShipmentById(req.user!.tenantId, validated.params.shipmentId);
      res.status(200).json(ApiResponse.success(result, 'Sales shipment fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  postSalesShipment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = shipmentIdParamSchema.parse(req);
      const result = await this.salesService.postSalesShipment(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.shipmentId
      );
      res.status(200).json(ApiResponse.success(result, 'Sales shipment posted successfully.'));
    } catch (error) {
      next(error);
    }
  };

  allocateSalesShipment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = shipmentIdParamSchema.parse(req);
      const result = await this.salesService.allocateSalesShipment(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.shipmentId
      );
      res.status(200).json(ApiResponse.success(result, 'Sales shipment allocated for WMS picking.'));
    } catch (error) {
      next(error);
    }
  };

  packSalesShipment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = shipmentIdParamSchema.parse(req);
      const result = await this.salesService.packSalesShipment(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.shipmentId
      );
      res.status(200).json(ApiResponse.success(result, 'Sales shipment packed successfully.'));
    } catch (error) {
      next(error);
    }
  };

  dispatchSalesShipment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = shipmentIdParamSchema.parse(req);
      // Optional carrier tracking payload can be handled here
      const result = await this.salesService.dispatchSalesShipment(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.shipmentId,
        req.body
      );
      res.status(200).json(ApiResponse.success(result, 'Sales shipment dispatched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  cancelSalesShipment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = shipmentIdParamSchema.parse(req);
      const result = await this.salesService.cancelSalesShipment(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.shipmentId
      );
      res.status(200).json(ApiResponse.success(result, 'Sales shipment cancelled successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
