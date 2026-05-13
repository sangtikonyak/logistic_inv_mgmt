import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../../common/response/api-response';
import { InventoryCountService } from '../services/inventory-count.service';
import { 
  createCountPlanSchema, 
  taskIdParamSchema, 
  confirmCountItemSchema 
} from '../dtos/inventory-count.schema';

export class InventoryCountController {
  constructor(private readonly countService: InventoryCountService) {}

  createCountPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createCountPlanSchema.parse(req);
      const result = await this.countService.createCountPlan(
        req.user!.tenantId,
        req.user!.userId,
        validated.body
      );
      res.status(201).json(ApiResponse.success(result, 'Inventory count plan created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  startCountTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = taskIdParamSchema.parse(req);
      const result = await this.countService.startCountTask(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.taskId
      );
      res.status(200).json(ApiResponse.success(result, 'Count task started.'));
    } catch (error) {
      next(error);
    }
  };

  confirmCountItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = confirmCountItemSchema.parse(req);
      const result = await this.countService.confirmCountItem(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.taskId,
        validated.params.itemId,
        validated.body.countedQuantity
      );
      res.status(200).json(ApiResponse.success(result, 'Count confirmed.'));
    } catch (error) {
      next(error);
    }
  };

  reconcileCountTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = taskIdParamSchema.parse(req);
      const result = await this.countService.reconcileCountTask(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.taskId
      );
      res.status(200).json(ApiResponse.success(result, 'Count task reconciled and completed.'));
    } catch (error) {
      next(error);
    }
  };
}
