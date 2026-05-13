import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../../common/exceptions/app-error';
import { ApiResponse } from '../../../common/response/api-response';
import {
  createProductSchema,
  listProductsSchema,
  productIdParamSchema,
  updateProductSchema,
} from '../dtos/product.schema';
import { ProductModuleDependencies } from '../product.module';
import { ProductService } from '../services/product.service';

export class ProductController {
  private readonly productService: ProductService;

  constructor(dependencies: ProductModuleDependencies) {
    this.productService = new ProductService(dependencies.db, dependencies.unitOfWork, dependencies.activityService);
  }

  createProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized: User context missing', 401);
      }
      const validatedData = createProductSchema.parse(req).body;
      const result = await this.productService.createProduct(
        req.user.tenantId,
        req.user.userId,
        validatedData
      );
      res.status(201).json(ApiResponse.success(result, 'Product created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized: User context missing', 401);
      }
      const validatedRequest = updateProductSchema.parse(req);
      const result = await this.productService.updateProduct(
        req.user.tenantId,
        req.user.userId,
        validatedRequest.params.productId,
        validatedRequest.body
      );
      res.status(200).json(ApiResponse.success(result, 'Product updated successfully.'));
    } catch (error) {
      next(error);
    }
  };

  deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized: User context missing', 401);
      }
      const validatedRequest = productIdParamSchema.parse(req);
      const result = await this.productService.deleteProduct(
        req.user.tenantId,
        req.user.userId,
        validatedRequest.params.productId
      );
      res.status(200).json(ApiResponse.success(result, 'Product deleted successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getProductById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized: User context missing', 401);
      }
      const validatedRequest = productIdParamSchema.parse(req);
      const result = await this.productService.getProductById(
        req.user.tenantId,
        validatedRequest.params.productId
      );
      res.status(200).json(ApiResponse.success(result, 'Product fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized: User context missing', 401);
      }
      const validatedRequest = listProductsSchema.parse(req);
      const result = await this.productService.listProducts(req.user.tenantId, validatedRequest.query);
      res.status(200).json(ApiResponse.success(result, 'Products fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
