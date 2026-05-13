export type APInvoiceStatus =
  | 'DRAFT'
  | 'PENDING_MATCH'
  | 'MATCHED'
  | 'APPROVED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CANCELLED'
  | 'DISPUTED';

export interface APInvoice {
  id: string;
  tenant_id: string;
  supplier_id: string;
  purchase_order_id: string | null;
  invoice_number: string;
  invoice_date: Date;
  due_date: Date | null;
  currency_code: string;
  subtotal_amount: string;
  tax_amount: string;
  discount_amount: string;
  total_amount: string;
  paid_amount: string;
  status: APInvoiceStatus;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export type ARInvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'OVERDUE';

export interface ARInvoice {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  sales_order_id: string | null;
  invoice_number: string;
  invoice_date: Date;
  due_date: Date | null;
  currency_code: string;
  subtotal_amount: string;
  tax_amount: string;
  discount_amount: string;
  total_amount: string;
  paid_amount: string;
  status: ARInvoiceStatus;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export type MatchStatus = 'SUCCESS' | 'QUANTITY_MISMATCH' | 'PRICE_MISMATCH' | 'BOTH_MISMATCH';

export interface ThreeWayMatchLog {
  id: string;
  tenant_id: string;
  ap_invoice_id: string;
  purchase_order_id: string;
  purchase_receipt_id: string;
  match_status: MatchStatus;
  details: any;
  matched_at: Date;
}

export interface CreateAPInvoiceInput {
  supplierId: string;
  purchaseOrderId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  currencyCode?: string;
  subtotalAmount: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  notes?: string;
}

export interface PerformThreeWayMatchInput {
  apInvoiceId: string;
  purchaseOrderId: string;
  purchaseReceiptId: string;
}
