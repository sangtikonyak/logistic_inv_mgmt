import mysql from 'mysql2/promise';
import { DatabaseTransaction, Queryable, QueryParams } from '../../../database/database.types';

export interface InventoryCountPlan {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  plan_number: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  count_type: 'FULL' | 'CYCLE' | 'SPOT';
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryCountTask {
  id: string;
  tenant_id: string;
  plan_id: string;
  bin_id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assigned_to: string | null;
  started_at: Date | null;
  completed_at: Date | null;
}

export interface InventoryCountItem {
  id: string;
  tenant_id: string;
  task_id: string;
  product_id: string;
  product_variant_id: string | null;
  expected_quantity: string;
  counted_quantity: string | null;
  discrepancy_quantity: string | null;
  reconciled: boolean;
  reconciled_at: Date | null;
}

export class InventoryCountRepository {
  constructor(private readonly executor: Queryable) {}

  async createPlan(plan: Omit<InventoryCountPlan, 'created_at' | 'updated_at'>, executor: Queryable | DatabaseTransaction) {
    const sql = `
      INSERT INTO inventory_count_plans 
      (id, tenant_id, warehouse_id, plan_number, name, status, count_type, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute(sql, [
      plan.id, plan.tenant_id, plan.warehouse_id, plan.plan_number, plan.name, 
      plan.status, plan.count_type, plan.created_by, plan.updated_by
    ]);
  }

  async createCountTask(task: Omit<InventoryCountTask, 'created_at' | 'updated_at'>, executor: Queryable | DatabaseTransaction) {
    const sql = `
      INSERT INTO inventory_count_tasks (id, tenant_id, plan_id, bin_id, status, assigned_to, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute(sql, [task.id, task.tenant_id, task.plan_id, task.bin_id, task.status, task.assigned_to]);
  }

  async createCountItem(item: Omit<InventoryCountItem, 'created_at' | 'updated_at'>, executor: Queryable | DatabaseTransaction) {
    const sql = `
      INSERT INTO inventory_count_items 
      (id, tenant_id, task_id, product_id, product_variant_id, expected_quantity, counted_quantity, discrepancy_quantity, reconciled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute(sql, [
      item.id, item.tenant_id, item.task_id, item.product_id, item.product_variant_id, 
      item.expected_quantity, item.counted_quantity, item.discrepancy_quantity, item.reconciled
    ]);
  }

  async findPlanById(tenantId: string, planId: string): Promise<InventoryCountPlan | null> {
    const sql = `SELECT * FROM inventory_count_plans WHERE tenant_id = ? AND id = ?`;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, [tenantId, planId]);
    return (rows as InventoryCountPlan[])[0] ?? null;
  }

  async updatePlanStatus(tenantId: string, planId: string, status: string, actorUserId: string, executor: Queryable | DatabaseTransaction) {
    const sql = `UPDATE inventory_count_plans SET status = ?, updated_by = ?, updated_at = NOW() WHERE tenant_id = ? AND id = ?`;
    await executor.execute(sql, [status, actorUserId, tenantId, planId]);
  }

  async listTasksByPlan(tenantId: string, planId: string): Promise<InventoryCountTask[]> {
    const sql = `SELECT * FROM inventory_count_tasks WHERE tenant_id = ? AND plan_id = ?`;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, [tenantId, planId]);
    return rows as InventoryCountTask[];
  }

  async findTaskById(tenantId: string, taskId: string): Promise<InventoryCountTask | null> {
    const sql = `SELECT * FROM inventory_count_tasks WHERE tenant_id = ? AND id = ?`;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, [tenantId, taskId]);
    return (rows as InventoryCountTask[])[0] ?? null;
  }

  async updateTaskStatus(tenantId: string, taskId: string, status: string, executor: Queryable | DatabaseTransaction) {
    const sql = `UPDATE inventory_count_tasks SET status = ?, updated_at = NOW() WHERE tenant_id = ? AND id = ?`;
    await executor.execute(sql, [status, tenantId, taskId]);
  }

  async listItemsByTask(tenantId: string, taskId: string): Promise<InventoryCountItem[]> {
    const sql = `SELECT * FROM inventory_count_items WHERE tenant_id = ? AND task_id = ?`;
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, [tenantId, taskId]);
    return rows as InventoryCountItem[];
  }

  async updateCountItem(tenantId: string, itemId: string, payload: Partial<InventoryCountItem>, executor: Queryable | DatabaseTransaction) {
    const sets: string[] = [];
    const params: any[] = [];
    
    if (payload.counted_quantity !== undefined) {
      sets.push('counted_quantity = ?');
      params.push(payload.counted_quantity);
    }
    if (payload.discrepancy_quantity !== undefined) {
      sets.push('discrepancy_quantity = ?');
      params.push(payload.discrepancy_quantity);
    }
    if (payload.reconciled !== undefined) {
      sets.push('reconciled = ?');
      params.push(payload.reconciled);
      if (payload.reconciled) {
        sets.push('reconciled_at = NOW()');
      }
    }

    if (sets.length === 0) return;

    const sql = `UPDATE inventory_count_items SET ${sets.join(', ')}, updated_at = NOW() WHERE tenant_id = ? AND id = ?`;
    params.push(tenantId, itemId);
    await executor.execute(sql, params);
  }
}
