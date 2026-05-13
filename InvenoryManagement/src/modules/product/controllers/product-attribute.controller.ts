import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../../common/response/api-response';
import {
  createProductAttributeSchema,
  createProductAttributeValueSchema,
  productAttributeIdParamSchema,
  productAttributeValueIdParamSchema,
  productIdWithAttributeParamsSchema,
  updateProductAttributeSchema,
  updateProductAttributeValueSchema,
} from '../dtos/product.schema';
import { Queryable } from '../../../database/database.types';
import { ProductAttributeService } from '../services/product-attribute.service';

export class ProductAttributeController {
  private readonly attributeService: ProductAttributeService;

  constructor(db: Queryable) {
    this.attributeService = new ProductAttributeService(db);
  }

  listAttributes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedRequest = productIdWithAttributeParamsSchema.parse(req);
      const result = await this.attributeService.listAttributes(
        req.user!.tenantId,
        validatedRequest.params.productId
      );
      res.status(200).json(ApiResponse.success(result, 'Product attributes fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  createAttribute = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedRequest = createProductAttributeSchema.parse(req);
      const result = await this.attributeService.createAttribute(
        req.user!.tenantId,
        validatedRequest.params.productId,
        validatedRequest.body
      );
      res.status(201).json(ApiResponse.success(result, 'Product attribute created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  updateAttribute = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedRequest = updateProductAttributeSchema.parse(req);
      const result = await this.attributeService.updateAttribute(
        req.user!.tenantId,
        validatedRequest.params.productId,
        validatedRequest.params.attributeId,
        validatedRequest.body
      );
      res.status(200).json(ApiResponse.success(result, 'Product attribute updated successfully.'));
    } catch (error) {
      next(error);
    }
  };

  deleteAttribute = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedRequest = productAttributeIdParamSchema.parse(req);
      const result = await this.attributeService.deleteAttribute(
        req.user!.tenantId,
        validatedRequest.params.productId,
        validatedRequest.params.attributeId
      );
      res.status(200).json(ApiResponse.success(result, 'Product attribute deleted successfully.'));
    } catch (error) {
      next(error);
    }
  };

  createAttributeValue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedRequest = createProductAttributeValueSchema.parse(req);
      const result = await this.attributeService.createAttributeValue(
        req.user!.tenantId,
        validatedRequest.params.productId,
        validatedRequest.params.attributeId,
        validatedRequest.body
      );
      res.status(201).json(ApiResponse.success(result, 'Product attribute value created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  updateAttributeValue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedRequest = updateProductAttributeValueSchema.parse(req);
      const result = await this.attributeService.updateAttributeValue(
        req.user!.tenantId,
        validatedRequest.params.productId,
        validatedRequest.params.attributeId,
        validatedRequest.params.valueId,
        validatedRequest.body
      );
      res.status(200).json(ApiResponse.success(result, 'Product attribute value updated successfully.'));
    } catch (error) {
      next(error);
    }
  };

  deleteAttributeValue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedRequest = productAttributeValueIdParamSchema.parse(req);
      const result = await this.attributeService.deleteAttributeValue(
        req.user!.tenantId,
        validatedRequest.params.productId,
        validatedRequest.params.attributeId,
        validatedRequest.params.valueId
      );
      res.status(200).json(ApiResponse.success(result, 'Product attribute value deleted successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
