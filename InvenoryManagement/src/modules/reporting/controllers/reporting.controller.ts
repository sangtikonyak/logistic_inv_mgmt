import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../../common/exceptions/app-error';
import { ApiResponse } from '../../../common/response/api-response';
import {
  dashboardSummarySchema,
  inventoryMovementSummarySchema,
  inventoryStockSummarySchema,
  inventoryValuationSchema,
  lowStockSchema,
  nonMovingProductsSchema,
  purchaseReceiptsTrendSchema,
  purchaseSummarySchema,
  purchasesBySupplierSchema,
  returnsSummarySchema,
  returnsTrendSchema,
  salesByCustomerSchema,
  salesReservationsTrendSchema,
  salesShipmentsTrendSchema,
  salesOrdersTrendSchema,
  salesSummarySchema,
  topPurchasedProductsSchema,
  topSellingProductsSchema,
  warehouseSummarySchema,
  warehouseUtilizationSchema,
} from '../dtos/reporting.schema';
import { ReportingModuleDependencies } from '../reporting.module';
import { ReportingService } from '../services/reporting.service';

export class ReportingController {
  private readonly reportingService: ReportingService;

  constructor(dependencies: ReportingModuleDependencies) {
    this.reportingService = new ReportingService(dependencies.db, dependencies.unitOfWork, dependencies.activityService);
  }

  getDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = dashboardSummarySchema.parse(req);
      const result = await this.reportingService.getDashboardSummary(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Dashboard summary fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getDashboardActivities = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('User context not found.', 401);
      }
      const result = await this.reportingService.getDashboardActivities(req.user.tenantId);
      res.status(200).json(ApiResponse.success(result, 'Dashboard activities fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getInventoryStockSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = inventoryStockSummarySchema.parse(req);
      const result = await this.reportingService.getInventoryStockSummary(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Inventory stock summary fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getInventoryMovementSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = inventoryMovementSummarySchema.parse(req);
      const result = await this.reportingService.getInventoryMovementSummary(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Inventory movement summary fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getLowStockReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = lowStockSchema.parse(req);
      const result = await this.reportingService.getLowStockReport(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Low stock report fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getInventoryValuation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = inventoryValuationSchema.parse(req);
      const result = await this.reportingService.getInventoryValuation(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Inventory valuation fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getPurchaseSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = purchaseSummarySchema.parse(req);
      const result = await this.reportingService.getPurchaseSummary(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Purchase summary fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getPurchasesBySupplier = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = purchasesBySupplierSchema.parse(req);
      const result = await this.reportingService.getPurchasesBySupplier(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Purchase by supplier report fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getPurchaseReceiptsTrend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = purchaseReceiptsTrendSchema.parse(req);
      const result = await this.reportingService.getPurchaseReceiptsTrend(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Purchase receipts trend fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getSalesSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = salesSummarySchema.parse(req);
      const result = await this.reportingService.getSalesSummary(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Sales summary fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getSalesByCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = salesByCustomerSchema.parse(req);
      const result = await this.reportingService.getSalesByCustomer(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Sales by customer report fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getSalesOrdersTrend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = salesOrdersTrendSchema.parse(req);
      const result = await this.reportingService.getSalesOrdersTrend(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Sales orders trend fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getSalesShipmentsTrend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = salesShipmentsTrendSchema.parse(req);
      const result = await this.reportingService.getSalesShipmentsTrend(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Sales shipments trend fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getSalesReservationsTrend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = salesReservationsTrendSchema.parse(req);
      const result = await this.reportingService.getSalesReservationsTrend(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Sales reservations trend fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getReturnsSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = returnsSummarySchema.parse(req);
      const result = await this.reportingService.getReturnsSummary(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Returns summary fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getReturnsTrend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = returnsTrendSchema.parse(req);
      const result = await this.reportingService.getReturnsTrend(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Returns trend fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getWarehouseSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = warehouseSummarySchema.parse(req);
      const result = await this.reportingService.getWarehouseSummary(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Warehouse summary fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getWarehouseUtilization = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = warehouseUtilizationSchema.parse(req);
      const result = await this.reportingService.getWarehouseUtilization(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Warehouse utilization fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getTopSellingProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = topSellingProductsSchema.parse(req);
      const result = await this.reportingService.getTopSellingProducts(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Top selling products fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getTopPurchasedProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = topPurchasedProductsSchema.parse(req);
      const result = await this.reportingService.getTopPurchasedProducts(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Top purchased products fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getNonMovingProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = nonMovingProductsSchema.parse(req);
      const result = await this.reportingService.getNonMovingProducts(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Non-moving products fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
