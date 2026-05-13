import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../../common/response/api-response';
import {
  binIdParamSchema,
  createBinSchema,
  createWarehouseSchema,
  createZoneSchema,
  listBinsSchema,
  listWarehousesSchema,
  listZonesSchema,
  updateBinSchema,
  updateWarehouseSchema,
  updateZoneSchema,
  warehouseIdParamSchema,
  zoneIdParamSchema,
} from '../dtos/warehouse.schema';
import { WarehouseModuleDependencies } from '../warehouse.module';
import { WarehouseService } from '../services/warehouse.service';

export class WarehouseController {
  private readonly warehouseService: WarehouseService;

  constructor(dependencies: WarehouseModuleDependencies) {
    this.warehouseService = new WarehouseService(
      dependencies.db,
      dependencies.unitOfWork,
      dependencies.activityService
    );
  }

  createWarehouse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createWarehouseSchema.parse(req);
      const result = await this.warehouseService.createWarehouse(
        req.user!.tenantId,
        req.user!.userId,
        validated.body
      );
      res.status(201).json(ApiResponse.success(result, 'Warehouse created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  updateWarehouse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateWarehouseSchema.parse(req);
      const result = await this.warehouseService.updateWarehouse(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.warehouseId,
        validated.body
      );
      res.status(200).json(ApiResponse.success(result, 'Warehouse updated successfully.'));
    } catch (error) {
      next(error);
    }
  };

  deleteWarehouse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = warehouseIdParamSchema.parse(req);
      const result = await this.warehouseService.deleteWarehouse(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.warehouseId
      );
      res.status(200).json(ApiResponse.success(result, 'Warehouse deleted successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getWarehouseById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = warehouseIdParamSchema.parse(req);
      const result = await this.warehouseService.getWarehouseById(
        req.user!.tenantId,
        validated.params.warehouseId
      );
      res.status(200).json(ApiResponse.success(result, 'Warehouse fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listWarehouses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = listWarehousesSchema.parse(req);
      const result = await this.warehouseService.listWarehouses(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Warehouses fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  setDefaultWarehouse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = warehouseIdParamSchema.parse(req);
      const result = await this.warehouseService.setDefaultWarehouse(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.warehouseId
      );
      res.status(200).json(ApiResponse.success(result, 'Default warehouse updated successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listZones = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = listZonesSchema.parse(req);
      const result = await this.warehouseService.listZones(req.user!.tenantId, validated.params.warehouseId);
      res.status(200).json(ApiResponse.success(result, 'Zones fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  createZone = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createZoneSchema.parse(req);
      const result = await this.warehouseService.createZone(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.warehouseId,
        validated.body
      );
      res.status(201).json(ApiResponse.success(result, 'Zone created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  updateZone = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateZoneSchema.parse(req);
      const result = await this.warehouseService.updateZone(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.zoneId,
        validated.body
      );
      res.status(200).json(ApiResponse.success(result, 'Zone updated successfully.'));
    } catch (error) {
      next(error);
    }
  };

  deleteZone = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = zoneIdParamSchema.parse(req);
      const result = await this.warehouseService.deleteZone(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.zoneId
      );
      res.status(200).json(ApiResponse.success(result, 'Zone deleted successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listBins = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = listBinsSchema.parse(req);
      const result = await this.warehouseService.listBins(req.user!.tenantId, validated.params.zoneId);
      res.status(200).json(ApiResponse.success(result, 'Bins fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  createBin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createBinSchema.parse(req);
      const result = await this.warehouseService.createBin(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.zoneId,
        validated.body
      );
      res.status(201).json(ApiResponse.success(result, 'Bin created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  updateBin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateBinSchema.parse(req);
      const result = await this.warehouseService.updateBin(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.binId,
        validated.body
      );
      res.status(200).json(ApiResponse.success(result, 'Bin updated successfully.'));
    } catch (error) {
      next(error);
    }
  };

  deleteBin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = binIdParamSchema.parse(req);
      const result = await this.warehouseService.deleteBin(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.binId
      );
      res.status(200).json(ApiResponse.success(result, 'Bin deleted successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
