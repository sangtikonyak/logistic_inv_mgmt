import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../../common/response/api-response';
import { FinanceService } from '../services/finance.service';
import { z } from 'zod';

const createAPInvoiceSchema = z.object({
  body: z.object({
    supplierId: z.string().uuid(),
    purchaseOrderId: z.string().uuid().optional(),
    invoiceNumber: z.string(),
    invoiceDate: z.string().date(),
    dueDate: z.string().date().optional(),
    currencyCode: z.string().length(3).optional(),
    subtotalAmount: z.number().nonnegative(),
    taxAmount: z.number().nonnegative().optional(),
    discountAmount: z.number().nonnegative().optional(),
    totalAmount: z.number().nonnegative(),
    notes: z.string().optional(),
  }),
});

const threeWayMatchSchema = z.object({
  body: z.object({
    apInvoiceId: z.string().uuid(),
    purchaseOrderId: z.string().uuid(),
    purchaseReceiptId: z.string().uuid(),
  }),
});

export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  createAPInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createAPInvoiceSchema.parse(req);
      const result = await this.financeService.createAPInvoice(
        req.user!.tenantId,
        req.user!.userId,
        validated.body
      );
      res.status(201).json(ApiResponse.success(result, 'AP Invoice created successfully.'));
    } catch (error) {
      next(error);
    }
  };

  performMatch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = threeWayMatchSchema.parse(req);
      const result = await this.financeService.performThreeWayMatch(
        req.user!.tenantId,
        req.user!.userId,
        validated.body
      );
      res.status(200).json(ApiResponse.success(result, '3-way match performed successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
