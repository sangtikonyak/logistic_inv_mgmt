import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../../common/response/api-response';
import {
  createPurchaseOrderSchema,
  createPurchaseReceiptSchema,
  listPurchaseOrdersSchema,
  listPurchaseReceiptsSchema,
  purchaseOrderIdParamSchema,
  receiptIdParamSchema,
  updatePurchaseOrderSchema,
} from '../dtos/purchase.schema';
import { PurchaseModuleDependencies } from '../purchase.module';
import { PurchaseService } from '../services/purchase.service';

export class PurchaseController {
  private readonly purchaseService: PurchaseService;

  constructor(dependencies: PurchaseModuleDependencies) {
    this.purchaseService = new PurchaseService(
      dependencies.db,
      dependencies.unitOfWork,
      dependencies.activityService
    );
  }

  createPurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createPurchaseOrderSchema.parse(req);
      const result = await this.purchaseService.createPurchaseOrder(
        req.user!.tenantId,
        req.user!.userId,
        validated.body
      );
      res.status(201).json(ApiResponse.success(result, 'Purchase order created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  updatePurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updatePurchaseOrderSchema.parse(req);
      const result = await this.purchaseService.updatePurchaseOrder(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.purchaseOrderId,
        validated.body
      );
      res.status(200).json(ApiResponse.success(result, 'Purchase order updated successfully.'));
    } catch (error) {
      next(error);
    }
  };

  submitForApproval = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = purchaseOrderIdParamSchema.parse(req);
      const result = await this.purchaseService.submitPurchaseOrderForApproval(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.purchaseOrderId
      );
      res.status(200).json(ApiResponse.success(result, 'Purchase order submitted for approval.'));
    } catch (error) {
      next(error);
    }
  };

  approve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = purchaseOrderIdParamSchema.parse(req);
      const result = await this.purchaseService.approvePurchaseOrder(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.purchaseOrderId
      );
      res.status(200).json(ApiResponse.success(result, 'Purchase order approved.'));
    } catch (error) {
      next(error);
    }
  };

  reject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = purchaseOrderIdParamSchema.parse(req);
      const result = await this.purchaseService.rejectPurchaseOrder(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.purchaseOrderId
      );
      res.status(200).json(ApiResponse.success(result, 'Purchase order rejected.'));
    } catch (error) {
      next(error);
    }
  };

  issuePurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = purchaseOrderIdParamSchema.parse(req);
      const result = await this.purchaseService.issuePurchaseOrder(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.purchaseOrderId
      );
      res.status(200).json(ApiResponse.success(result, 'Purchase order issued successfully.'));
    } catch (error) {
      next(error);
    }
  };

  cancelPurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = purchaseOrderIdParamSchema.parse(req);
      const result = await this.purchaseService.cancelPurchaseOrder(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.purchaseOrderId
      );
      res.status(200).json(ApiResponse.success(result, 'Purchase order cancelled successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listPurchaseOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = listPurchaseOrdersSchema.parse(req);
      const result = await this.purchaseService.listPurchaseOrders(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Purchase orders fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getPurchaseOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = purchaseOrderIdParamSchema.parse(req);
      const result = await this.purchaseService.getPurchaseOrderById(
        req.user!.tenantId,
        validated.params.purchaseOrderId
      );
      res.status(200).json(ApiResponse.success(result, 'Purchase order fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  createPurchaseReceipt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createPurchaseReceiptSchema.parse(req);
      const result = await this.purchaseService.createPurchaseReceipt(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.purchaseOrderId,
        validated.body
      );
      res.status(201).json(ApiResponse.success(result, 'Purchase receipt created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listPurchaseReceipts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = listPurchaseReceiptsSchema.parse(req);
      const result = await this.purchaseService.listPurchaseReceipts(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Purchase receipts fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getPurchaseReceiptById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = receiptIdParamSchema.parse(req);
      const result = await this.purchaseService.getPurchaseReceiptById(
        req.user!.tenantId,
        validated.params.receiptId
      );
      res.status(200).json(ApiResponse.success(result, 'Purchase receipt fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  postPurchaseReceipt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = receiptIdParamSchema.parse(req);
      const result = await this.purchaseService.postPurchaseReceipt(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.receiptId
      );
      res.status(200).json(ApiResponse.success(result, 'Purchase receipt posted successfully.'));
    } catch (error) {
      next(error);
    }
  };

  cancelPurchaseReceipt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = receiptIdParamSchema.parse(req);
      const result = await this.purchaseService.cancelPurchaseReceipt(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.receiptId
      );
      res.status(200).json(ApiResponse.success(result, 'Purchase receipt cancelled successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
