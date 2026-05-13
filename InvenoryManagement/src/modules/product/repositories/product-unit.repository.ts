import mysql from 'mysql2/promise';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import { ProductUnit } from '../types/product.types';

export class ProductUnitRepository {
  constructor(private readonly executor: Queryable) {}

  async create(
    unit: Omit<ProductUnit, 'created_at' | 'updated_at' | 'deleted_at'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const sql = `
      INSERT INTO product_units (id, tenant_id, name, code, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `;

    await executor.execute<mysql.ResultSetHeader>(sql, [
      unit.id,
      unit.tenant_id,
      unit.name,
      unit.code,
      unit.description,
    ]);
  }

  async update(
    tenantId: string,
    unitId: string,
    payload: Pick<ProductUnit, 'name' | 'code' | 'description'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const sql = `
      UPDATE product_units
      SET name = ?, code = ?, description = ?, updated_at = NOW()
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
    `;

    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.name,
      payload.code,
      payload.description,
      unitId,
      tenantId,
    ]);
  }

  async findById(tenantId: string, unitId: string): Promise<ProductUnit | null> {
    const sql = `
      SELECT *
      FROM product_units
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
      LIMIT 1
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [unitId, tenantId]);
    const units = rows as ProductUnit[];
    return units[0] ?? null;
  }

  async findByIds(tenantId: string, unitIds: string[]): Promise<ProductUnit[]> {
    if (unitIds.length === 0) {
      return [];
    }

    const placeholders = unitIds.map(() => '?').join(', ');
    const sql = `
      SELECT *
      FROM product_units
      WHERE tenant_id = ? AND deleted_at IS NULL AND id IN (${placeholders})
      ORDER BY name ASC
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, ...unitIds]);
    return rows as ProductUnit[];
  }

  async list(tenantId: string): Promise<ProductUnit[]> {
    const sql = `
      SELECT *
      FROM product_units
      WHERE tenant_id = ? AND deleted_at IS NULL
      ORDER BY name ASC, id ASC
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId]);
    return rows as ProductUnit[];
  }

  async existsByName(tenantId: string, name: string, excludeUnitId?: string): Promise<boolean> {
    const params: string[] = [tenantId, name];
    let sql = `
      SELECT id
      FROM product_units
      WHERE tenant_id = ? AND name = ? AND deleted_at IS NULL
    `;

    if (excludeUnitId) {
      sql += ' AND id <> ?';
      params.push(excludeUnitId);
    }

    sql += ' LIMIT 1';
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return rows.length > 0;
  }

  async existsByCode(tenantId: string, code: string, excludeUnitId?: string): Promise<boolean> {
    const params: string[] = [tenantId, code];
    let sql = `
      SELECT id
      FROM product_units
      WHERE tenant_id = ? AND code = ? AND deleted_at IS NULL
    `;

    if (excludeUnitId) {
      sql += ' AND id <> ?';
      params.push(excludeUnitId);
    }

    sql += ' LIMIT 1';
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return rows.length > 0;
  }

  async isInUse(tenantId: string, unitId: string): Promise<boolean> {
    const sql = `
      SELECT id
      FROM (
        SELECT p.id
        FROM products p
        WHERE p.tenant_id = ? AND p.unit_id = ? AND p.deleted_at IS NULL
        UNION
        SELECT pv.id
        FROM product_variants pv
        WHERE pv.tenant_id = ? AND pv.unit_id = ? AND pv.deleted_at IS NULL
      ) AS active_usages
      LIMIT 1
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [
      tenantId,
      unitId,
      tenantId,
      unitId,
    ]);
    return rows.length > 0;
  }

  async softDelete(
    tenantId: string,
    unitId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const sql = `
      UPDATE product_units
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
    `;

    await executor.execute<mysql.ResultSetHeader>(sql, [unitId, tenantId]);
  }
}
