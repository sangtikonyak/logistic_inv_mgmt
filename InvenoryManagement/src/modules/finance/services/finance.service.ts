import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../common/exceptions/app-error';
import { Queryable } from '../../../database/database.types';
import { UnitOfWork } from '../../../database/unit-of-work';
import { FinanceRepository } from '../repositories/finance.repository';
import { PurchaseRepository } from '../../purchase/repositories/purchase.repository';
import { CreateAPInvoiceInput, PerformThreeWayMatchInput } from '../types/finance.types';
import { ActivityService } from '../../activity/services/activity.service';

export class FinanceService {
  private readonly financeRepository: FinanceRepository;
  private readonly purchaseRepository: PurchaseRepository;

  constructor(
    db: Queryable,
    private readonly unitOfWork: UnitOfWork,
    private readonly activityService: ActivityService
  ) {
    this.financeRepository = new FinanceRepository(db);
    this.purchaseRepository = new PurchaseRepository(db);
  }

  async createAPInvoice(tenantId: string, actorUserId: string, input: CreateAPInvoiceInput) {
    const invoiceId = uuidv4();

    await this.financeRepository.createAPInvoice({
      id: invoiceId,
      tenant_id: tenantId,
      supplier_id: input.supplierId,
      purchase_order_id: input.purchaseOrderId ?? null,
      invoice_number: input.invoiceNumber,
      invoice_date: new Date(input.invoiceDate),
      due_date: input.dueDate ? new Date(input.dueDate) : null,
      currency_code: input.currencyCode ?? 'USD',
      subtotal_amount: input.subtotalAmount.toFixed(4),
      tax_amount: (input.taxAmount ?? 0).toFixed(4),
      discount_amount: (input.discountAmount ?? 0).toFixed(4),
      total_amount: input.totalAmount.toFixed(4),
      paid_amount: (0).toFixed(4),
      status: 'DRAFT',
      notes: input.notes ?? null,
    });

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'CREATE',
      module: 'FINANCE',
      description: `Created AP Invoice: ${input.invoiceNumber}`,
      metadata: { invoiceId, invoiceNumber: input.invoiceNumber },
    });

    return this.financeRepository.findAPInvoiceById(tenantId, invoiceId);
  }

  async performThreeWayMatch(tenantId: string, actorUserId: string, input: PerformThreeWayMatchInput) {
    const apInvoice = await this.financeRepository.findAPInvoiceById(tenantId, input.apInvoiceId);
    if (!apInvoice) throw new AppError('AP Invoice not found.', 404);

    const po = await this.purchaseRepository.findPurchaseOrderById(tenantId, input.purchaseOrderId);
    if (!po) throw new AppError('Purchase Order not found.', 404);

    const receipt = await this.purchaseRepository.findPurchaseReceiptById(tenantId, input.purchaseReceiptId);
    if (!receipt) throw new AppError('Purchase Receipt not found.', 404);

    // Simplified match logic: Compare total amounts
    const poTotal = Number(po.total_amount);
    const invoiceTotal = Number(apInvoice.total_amount);

    let matchStatus: 'SUCCESS' | 'PRICE_MISMATCH' = 'SUCCESS';
    if (Math.abs(poTotal - invoiceTotal) > 0.01) {
      matchStatus = 'PRICE_MISMATCH';
    }

    await this.unitOfWork.execute(async (transaction) => {
      await this.financeRepository.createMatchLog({
        id: uuidv4(),
        tenant_id: tenantId,
        ap_invoice_id: apInvoice.id,
        purchase_order_id: po.id,
        purchase_receipt_id: receipt.id,
        match_status: matchStatus,
        details: { poTotal, invoiceTotal },
      }, transaction);

      const nextStatus = matchStatus === 'SUCCESS' ? 'MATCHED' : 'DISPUTED';
      await this.financeRepository.updateAPInvoiceStatus(tenantId, apInvoice.id, nextStatus, transaction);
    });

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'FINANCE',
      description: `Performed 3-way match for AP Invoice: ${apInvoice.invoice_number}`,
      metadata: { apInvoiceId: apInvoice.id, matchStatus },
    });

    return this.financeRepository.findAPInvoiceById(tenantId, apInvoice.id);
  }
}
