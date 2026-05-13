import mysql from 'mysql2/promise';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import {
  APInvoice,
  ARInvoice,
  ThreeWayMatchLog,
} from '../types/finance.types';

export class FinanceRepository {
  constructor(private readonly executor: Queryable) {}

  async createAPInvoice(invoice: Omit<APInvoice, 'created_at' | 'updated_at'>, executor: Queryable | DatabaseTransaction = this.executor) {
    const sql = `
      INSERT INTO finance_ap_invoices (
        id, tenant_id, supplier_id, purchase_order_id, invoice_number, invoice_date, due_date,
        currency_code, subtotal_amount, tax_amount, discount_amount, total_amount, paid_amount, status, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      invoice.id,
      invoice.tenant_id,
      invoice.supplier_id,
      invoice.purchase_order_id,
      invoice.invoice_number,
      invoice.invoice_date,
      invoice.due_date,
      invoice.currency_code,
      invoice.subtotal_amount,
      invoice.tax_amount,
      invoice.discount_amount,
      invoice.total_amount,
      invoice.paid_amount,
      invoice.status,
      invoice.notes,
    ]);
  }

  async createARInvoice(invoice: Omit<ARInvoice, 'created_at' | 'updated_at'>, executor: Queryable | DatabaseTransaction = this.executor) {
    const sql = `
      INSERT INTO finance_ar_invoices (
        id, tenant_id, customer_id, sales_order_id, invoice_number, invoice_date, due_date,
        currency_code, subtotal_amount, tax_amount, discount_amount, total_amount, paid_amount, status, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      invoice.id,
      invoice.tenant_id,
      invoice.customer_id,
      invoice.sales_order_id,
      invoice.invoice_number,
      invoice.invoice_date,
      invoice.due_date,
      invoice.currency_code,
      invoice.subtotal_amount,
      invoice.tax_amount,
      invoice.discount_amount,
      invoice.total_amount,
      invoice.paid_amount,
      invoice.status,
      invoice.notes,
    ]);
  }

  async createMatchLog(log: Omit<ThreeWayMatchLog, 'matched_at'>, executor: Queryable | DatabaseTransaction = this.executor) {
    const sql = `
      INSERT INTO finance_three_way_match_logs (
        id, tenant_id, ap_invoice_id, purchase_order_id, purchase_receipt_id, match_status, details
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      log.id,
      log.tenant_id,
      log.ap_invoice_id,
      log.purchase_order_id,
      log.purchase_receipt_id,
      log.match_status,
      JSON.stringify(log.details),
    ]);
  }

  async updateAPInvoiceStatus(tenantId: string, invoiceId: string, status: string, executor: Queryable | DatabaseTransaction = this.executor) {
    const sql = `UPDATE finance_ap_invoices SET status = ? WHERE tenant_id = ? AND id = ?`;
    await executor.execute<mysql.ResultSetHeader>(sql, [status, tenantId, invoiceId]);
  }

  async findAPInvoiceById(tenantId: string, invoiceId: string, executor: Queryable | DatabaseTransaction = this.executor): Promise<APInvoice | null> {
    const sql = `SELECT * FROM finance_ap_invoices WHERE tenant_id = ? AND id = ?`;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, invoiceId]);
    return (rows as APInvoice[])[0] ?? null;
  }
}
