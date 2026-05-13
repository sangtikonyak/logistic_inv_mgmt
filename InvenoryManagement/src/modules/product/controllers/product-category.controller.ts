import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../../common/response/api-response';
import {
  categoryIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
} from '../dtos/product.schema';
import { Queryable } from '../../../database/database.types';
import { ProductCategoryService } from '../services/product-category.service';

export class ProductCategoryController {
  private readonly categoryService: ProductCategoryService;

  constructor(db: Queryable) {
    this.categoryService = new ProductCategoryService(db);
  }

  createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = createCategorySchema.parse(req).body;
      const result = await this.categoryService.createCategory(req.user!.tenantId, validatedData);
      res.status(201).json(ApiResponse.success(result, 'Category created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedRequest = updateCategorySchema.parse(req);
      const result = await this.categoryService.updateCategory(
        req.user!.tenantId,
        validatedRequest.params.categoryId,
        validatedRequest.body
      );
      res.status(200).json(ApiResponse.success(result, 'Category updated successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.categoryService.listCategories(req.user!.tenantId);
      res.status(200).json(ApiResponse.success(result, 'Categories fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedRequest = categoryIdParamSchema.parse(req);
      const result = await this.categoryService.deleteCategory(
        req.user!.tenantId,
        validatedRequest.params.categoryId
      );
      res.status(200).json(ApiResponse.success(result, 'Category deleted successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
