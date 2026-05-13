import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../../common/response/api-response';
import {
  createFieldDefinitionSchema,
  definitionIdParamSchema,
  updateFieldDefinitionSchema,
} from '../dtos/product.schema';
import { Queryable } from '../../../database/database.types';
import { ProductCustomFieldService } from '../services/product-custom-field.service';

export class ProductCustomFieldController {
  private readonly fieldService: ProductCustomFieldService;

  constructor(db: Queryable) {
    this.fieldService = new ProductCustomFieldService(db);
  }

  createDefinition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = createFieldDefinitionSchema.parse(req).body;
      const result = await this.fieldService.createDefinition(req.user!.tenantId, validatedData);
      res.status(201).json(ApiResponse.success(result, 'Custom field definition created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  updateDefinition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedRequest = updateFieldDefinitionSchema.parse(req);
      const result = await this.fieldService.updateDefinition(
        req.user!.tenantId,
        validatedRequest.params.definitionId,
        validatedRequest.body
      );
      res.status(200).json(ApiResponse.success(result, 'Custom field definition updated successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listDefinitions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.fieldService.listDefinitions(req.user!.tenantId);
      res.status(200).json(ApiResponse.success(result, 'Custom field definitions fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  deleteDefinition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedRequest = definitionIdParamSchema.parse(req);
      const result = await this.fieldService.deleteDefinition(
        req.user!.tenantId,
        validatedRequest.params.definitionId
      );
      res.status(200).json(ApiResponse.success(result, 'Custom field definition deleted successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
