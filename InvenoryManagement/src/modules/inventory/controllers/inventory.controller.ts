import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../../common/response/api-response';
import {
  createStockAdjustmentSchema,
  listMovementsSchema,
  listStockSchema,
  stockItemParamSchema,
  updateStockLocationSchema,
} from '../dtos/inventory.schema';
import { InventoryModuleDependencies } from '../inventory.module';
import { InventoryService } from '../services/inventory.service';

export class InventoryController {
  private readonly inventoryService: InventoryService;

  constructor(dependencies: InventoryModuleDependencies) {
    this.inventoryService = new InventoryService(
      dependencies.db,
      dependencies.unitOfWork,
      dependencies.activityService
    );
  }

  listStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = listStockSchema.parse(req);
      const result = await this.inventoryService.listStock(
        req.user!.tenantId,
        validated.params.warehouseId,
        validated.query
      );
      res.status(200).json(ApiResponse.success(result, 'Inventory stock fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listMovements = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = listMovementsSchema.parse(req);
      const result = await this.inventoryService.listMovements(
        req.user!.tenantId,
        validated.params.warehouseId,
        validated.query
      );
      res.status(200).json(ApiResponse.success(result, 'Inventory movements fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getStockItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = stockItemParamSchema.parse(req);
      const result = await this.inventoryService.getStockItem(
        req.user!.tenantId,
        validated.params.warehouseId,
        validated.params.itemId
      );
      res.status(200).json(ApiResponse.success(result, 'Inventory stock item fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  createStockAdjustment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createStockAdjustmentSchema.parse(req);
      const result = await this.inventoryService.createStockAdjustment(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.warehouseId,
        validated.body
      );
      res.status(201).json(ApiResponse.success(result, 'Inventory stock adjusted successfully.'));
    } catch (error) {
      next(error);
    }
  };

  updateStockLocation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateStockLocationSchema.parse(req);
      const result = await this.inventoryService.updateStockLocation(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.warehouseId,
        validated.params.itemId,
        validated.body
      );
      res.status(200).json(ApiResponse.success(result, 'Inventory stock location updated successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
