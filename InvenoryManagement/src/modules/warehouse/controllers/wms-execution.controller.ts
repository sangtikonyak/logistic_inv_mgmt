import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../../common/response/api-response';
import { WmsExecutionService } from '../services/wms-execution.service';
import { 
  listPicklistsSchema, 
  picklistIdParamSchema, 
  assignPicklistSchema, 
  confirmPickItemSchema 
} from '../dtos/warehouse.schema';

export class WmsExecutionController {
  constructor(private readonly wmsService: WmsExecutionService) {}

  listPicklists = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = listPicklistsSchema.parse(req);
      const result = await this.wmsService.listPicklists(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Picklists fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getPicklistById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = picklistIdParamSchema.parse(req);
      const result = await this.wmsService.getPicklistById(req.user!.tenantId, validated.params.picklistId);
      res.status(200).json(ApiResponse.success(result, 'Picklist fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  assignPicklist = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = assignPicklistSchema.parse(req);
      const result = await this.wmsService.assignPicklist(
        req.user!.tenantId, 
        req.user!.userId, 
        validated.params.picklistId, 
        validated.body.userId
      );
      res.status(200).json(ApiResponse.success(result, 'Picklist assigned successfully.'));
    } catch (error) {
      next(error);
    }
  };

  startPicking = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = picklistIdParamSchema.parse(req);
      const result = await this.wmsService.startPicking(req.user!.tenantId, req.user!.userId, validated.params.picklistId);
      res.status(200).json(ApiResponse.success(result, 'Picking started successfully.'));
    } catch (error) {
      next(error);
    }
  };

  confirmPickItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = confirmPickItemSchema.parse(req);
      const result = await this.wmsService.confirmPickItem(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.picklistId,
        validated.params.itemId,
        validated.body
      );
      res.status(200).json(ApiResponse.success(result, 'Item picked successfully.'));
    } catch (error) {
      next(error);
    }
  };

  completePicklist = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = picklistIdParamSchema.parse(req);
      const result = await this.wmsService.completePicklist(req.user!.tenantId, req.user!.userId, validated.params.picklistId);
      res.status(200).json(ApiResponse.success(result, 'Picklist completed successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
