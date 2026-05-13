import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../../common/response/api-response';
import {
  createCustomerSchema,
  customerIdParamSchema,
  listCustomersSchema,
  updateCustomerSchema,
} from '../dtos/sales.schema';
import { SalesModuleDependencies } from '../sales.module';
import { CustomerService } from '../services/customer.service';

export class CustomerController {
  private readonly customerService: CustomerService;

  constructor(dependencies: SalesModuleDependencies) {
    this.customerService = new CustomerService(
      dependencies.db,
      dependencies.activityService
    );
  }

  createCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createCustomerSchema.parse(req);
      const result = await this.customerService.createCustomer(
        req.user!.tenantId,
        req.user!.userId,
        validated.body
      );
      res.status(201).json(ApiResponse.success(result, 'Customer created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateCustomerSchema.parse(req);
      const result = await this.customerService.updateCustomer(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.customerId,
        validated.body
      );
      res.status(200).json(ApiResponse.success(result, 'Customer updated successfully.'));
    } catch (error) {
      next(error);
    }
  };

  deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = customerIdParamSchema.parse(req);
      const result = await this.customerService.deleteCustomer(
        req.user!.tenantId,
        req.user!.userId,
        validated.params.customerId
      );
      res.status(200).json(ApiResponse.success(result, 'Customer deleted successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = customerIdParamSchema.parse(req);
      const result = await this.customerService.getCustomerById(
        req.user!.tenantId,
        validated.params.customerId
      );
      res.status(200).json(ApiResponse.success(result, 'Customer fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listCustomers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = listCustomersSchema.parse(req);
      const result = await this.customerService.listCustomers(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Customers fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
