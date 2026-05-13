import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../../common/response/api-response';
import {
  createTransferSchema,
  listTransfersSchema,
  transferIdParamSchema,
} from '../dtos/inventory.schema';
import { InventoryModuleDependencies } from '../inventory.module';
import { InventoryTransferService } from '../services/inventory-transfer.service';

export class InventoryTransferController {
  private readonly transferService: InventoryTransferService;

  constructor(dependencies: InventoryModuleDependencies) {
    this.transferService = new InventoryTransferService(
      dependencies.db,
      dependencies.unitOfWork,
      dependencies.activityService
    );
  }

  createTransfer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createTransferSchema.parse(req);
      const result = await this.transferService.createTransfer(
        req.user!.tenantId,
        req.user!.userId,
        validated.body
      );
      res.status(201).json(ApiResponse.success(result, 'Inventory transfer created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listTransfers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = listTransfersSchema.parse(req);
      const result = await this.transferService.listTransfers(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Inventory transfers fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getTransferById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = transferIdParamSchema.parse(req);
      const result = await this.transferService.getTransferById(
        req.user!.tenantId,
        validated.params.transferId
      );
      res.status(200).json(ApiResponse.success(result, 'Inventory transfer fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  completeTransfer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = transferIdParamSchema.parse(req);
      const result = await this.transferService.completeTransfer(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.transferId
      );
      res.status(200).json(ApiResponse.success(result, 'Inventory transfer completed successfully.'));
    } catch (error) {
      next(error);
    }
  };

  cancelTransfer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = transferIdParamSchema.parse(req);
      const result = await this.transferService.cancelTransfer(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.transferId
      );
      res.status(200).json(ApiResponse.success(result, 'Inventory transfer cancelled successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
