import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../../common/response/api-response';
import {
  createSalesReturnSchema,
  listSalesReturnsSchema,
  salesReturnIdParamSchema,
  updateSalesReturnSchema,
} from '../dtos/returns.schema';
import { ReturnsModuleDependencies } from '../returns.module';
import { SalesReturnService } from '../services/sales-return.service';

export class SalesReturnController {
  private readonly service: SalesReturnService;

  constructor(dependencies: ReturnsModuleDependencies) {
    this.service = new SalesReturnService(
      dependencies.db,
      dependencies.unitOfWork,
      dependencies.activityService
    );
  }

  createSalesReturn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createSalesReturnSchema.parse(req);
      const result = await this.service.createSalesReturn(req.user!.tenantId, req.user!.userId, validated.body);
      res.status(201).json(ApiResponse.success(result, 'Sales return created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  updateSalesReturn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateSalesReturnSchema.parse(req);
      const result = await this.service.updateSalesReturn(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.salesReturnId,
        validated.body
      );
      res.status(200).json(ApiResponse.success(result, 'Sales return updated successfully.'));
    } catch (error) {
      next(error);
    }
  };

  cancelSalesReturn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = salesReturnIdParamSchema.parse(req);
      const result = await this.service.cancelSalesReturn(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.salesReturnId
      );
      res.status(200).json(ApiResponse.success(result, 'Sales return cancelled successfully.'));
    } catch (error) {
      next(error);
    }
  };

  postSalesReturn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = salesReturnIdParamSchema.parse(req);
      const result = await this.service.postSalesReturn(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.salesReturnId
      );
      res.status(200).json(ApiResponse.success(result, 'Sales return posted successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listSalesReturns = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = listSalesReturnsSchema.parse(req);
      const result = await this.service.listSalesReturns(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Sales returns fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getSalesReturnById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = salesReturnIdParamSchema.parse(req);
      const result = await this.service.getSalesReturnById(req.user!.tenantId, validated.params.salesReturnId);
      res.status(200).json(ApiResponse.success(result, 'Sales return fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
