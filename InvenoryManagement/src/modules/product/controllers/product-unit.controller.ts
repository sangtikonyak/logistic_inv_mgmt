import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../../common/response/api-response';
import {
  createUnitSchema,
  unitIdParamSchema,
  updateUnitSchema,
} from '../dtos/product.schema';
import { Queryable } from '../../../database/database.types';
import { ProductUnitService } from '../services/product-unit.service';

export class ProductUnitController {
  private readonly unitService: ProductUnitService;

  constructor(db: Queryable) {
    this.unitService = new ProductUnitService(db);
  }

  createUnit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = createUnitSchema.parse(req).body;
      const result = await this.unitService.createUnit(req.user!.tenantId, validatedData);
      res.status(201).json(ApiResponse.success(result, 'Unit created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  updateUnit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedRequest = updateUnitSchema.parse(req);
      const result = await this.unitService.updateUnit(
        req.user!.tenantId,
        validatedRequest.params.unitId,
        validatedRequest.body
      );
      res.status(200).json(ApiResponse.success(result, 'Unit updated successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listUnits = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.unitService.listUnits(req.user!.tenantId);
      res.status(200).json(ApiResponse.success(result, 'Units fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  deleteUnit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedRequest = unitIdParamSchema.parse(req);
      const result = await this.unitService.deleteUnit(
        req.user!.tenantId,
        validatedRequest.params.unitId
      );
      res.status(200).json(ApiResponse.success(result, 'Unit deleted successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
