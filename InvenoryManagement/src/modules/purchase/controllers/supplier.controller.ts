import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../../common/response/api-response';
import {
  createSupplierSchema,
  listSuppliersSchema,
  supplierIdParamSchema,
  updateSupplierSchema,
} from '../dtos/purchase.schema';
import { PurchaseModuleDependencies } from '../purchase.module';
import { SupplierService } from '../services/supplier.service';

export class SupplierController {
  private readonly supplierService: SupplierService;

  constructor(dependencies: PurchaseModuleDependencies) {
    this.supplierService = new SupplierService(
      dependencies.db,
      dependencies.activityService
    );
  }

  createSupplier = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createSupplierSchema.parse(req);
      const result = await this.supplierService.createSupplier(
        req.user!.tenantId,
        req.user!.userId,
        validated.body
      );
      res.status(201).json(ApiResponse.success(result, 'Supplier created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  updateSupplier = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateSupplierSchema.parse(req);
      const result = await this.supplierService.updateSupplier(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.supplierId,
        validated.body
      );
      res.status(200).json(ApiResponse.success(result, 'Supplier updated successfully.'));
    } catch (error) {
      next(error);
    }
  };

  deleteSupplier = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = supplierIdParamSchema.parse(req);
      const result = await this.supplierService.deleteSupplier(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.supplierId
      );
      res.status(200).json(ApiResponse.success(result, 'Supplier deleted successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getSupplierById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = supplierIdParamSchema.parse(req);
      const result = await this.supplierService.getSupplierById(
        req.user!.tenantId,
        validated.params.supplierId
      );
      res.status(200).json(ApiResponse.success(result, 'Supplier fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listSuppliers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = listSuppliersSchema.parse(req);
      const result = await this.supplierService.listSuppliers(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Suppliers fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
