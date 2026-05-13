import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../../common/response/api-response';
import {
  createPurchaseReturnSchema,
  listPurchaseReturnsSchema,
  purchaseReturnIdParamSchema,
  updatePurchaseReturnSchema,
} from '../dtos/returns.schema';
import { ReturnsModuleDependencies } from '../returns.module';
import { PurchaseReturnService } from '../services/purchase-return.service';

export class PurchaseReturnController {
  private readonly service: PurchaseReturnService;

  constructor(dependencies: ReturnsModuleDependencies) {
    this.service = new PurchaseReturnService(
      dependencies.db,
      dependencies.unitOfWork,
      dependencies.activityService
    );
  }

  createPurchaseReturn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createPurchaseReturnSchema.parse(req);
      const result = await this.service.createPurchaseReturn(req.user!.tenantId, req.user!.userId, validated.body);
      res.status(201).json(ApiResponse.success(result, 'Purchase return created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  updatePurchaseReturn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updatePurchaseReturnSchema.parse(req);
      const result = await this.service.updatePurchaseReturn(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.purchaseReturnId,
        validated.body
      );
      res.status(200).json(ApiResponse.success(result, 'Purchase return updated successfully.'));
    } catch (error) {
      next(error);
    }
  };

  cancelPurchaseReturn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = purchaseReturnIdParamSchema.parse(req);
      const result = await this.service.cancelPurchaseReturn(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.purchaseReturnId
      );
      res.status(200).json(ApiResponse.success(result, 'Purchase return cancelled successfully.'));
    } catch (error) {
      next(error);
    }
  };

  postPurchaseReturn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = purchaseReturnIdParamSchema.parse(req);
      const result = await this.service.postPurchaseReturn(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.purchaseReturnId
      );
      res.status(200).json(ApiResponse.success(result, 'Purchase return posted successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listPurchaseReturns = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = listPurchaseReturnsSchema.parse(req);
      const result = await this.service.listPurchaseReturns(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Purchase returns fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getPurchaseReturnById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = purchaseReturnIdParamSchema.parse(req);
      const result = await this.service.getPurchaseReturnById(req.user!.tenantId, validated.params.purchaseReturnId);
      res.status(200).json(ApiResponse.success(result, 'Purchase return fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
