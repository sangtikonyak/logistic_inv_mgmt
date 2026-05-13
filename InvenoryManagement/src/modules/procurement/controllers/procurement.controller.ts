import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../../common/response/api-response';
import { ProcurementModuleDependencies } from '../procurement.module';
import {
  createRequisitionSchema,
  listRequisitionsSchema,
  requisitionIdParamSchema,
} from '../dtos/procurement.schema';
import { ProcurementService } from '../services/procurement.service';

export class ProcurementController {
  private readonly procurementService: ProcurementService;

  constructor(dependencies: ProcurementModuleDependencies) {
    this.procurementService = new ProcurementService(
      dependencies.db,
      dependencies.unitOfWork,
      dependencies.activityService,
    );
  }

  createRequisition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createRequisitionSchema.parse(req);
      const result = await this.procurementService.createRequisition(
        req.user!.tenantId,
        req.user!.userId,
        validated.body,
      );
      res.status(201).json(ApiResponse.success(result, 'Procurement requisition created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listRequisitions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = listRequisitionsSchema.parse(req);
      const result = await this.procurementService.listRequisitions(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Procurement requisitions fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getRequisitionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = requisitionIdParamSchema.parse(req);
      const result = await this.procurementService.getRequisitionById(
        req.user!.tenantId,
        validated.params.requisitionId,
      );
      res.status(200).json(ApiResponse.success(result, 'Procurement requisition fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  submitRequisition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = requisitionIdParamSchema.parse(req);
      const result = await this.procurementService.submitRequisition(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.requisitionId,
      );
      res.status(200).json(ApiResponse.success(result, 'Procurement requisition submitted successfully.'));
    } catch (error) {
      next(error);
    }
  };

  approveRequisition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = requisitionIdParamSchema.parse(req);
      const result = await this.procurementService.approveRequisition(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.requisitionId,
      );
      res.status(200).json(ApiResponse.success(result, 'Procurement requisition approved successfully.'));
    } catch (error) {
      next(error);
    }
  };

  rejectRequisition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = requisitionIdParamSchema.parse(req);
      const result = await this.procurementService.rejectRequisition(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.requisitionId,
      );
      res.status(200).json(ApiResponse.success(result, 'Procurement requisition rejected successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
