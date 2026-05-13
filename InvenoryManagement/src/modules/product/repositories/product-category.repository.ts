import mysql from 'mysql2/promise';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import { ProductCategory } from '../types/product.types';

export class ProductCategoryRepository {
  constructor(private readonly executor: Queryable) {}

  async create(
    category: Omit<ProductCategory, 'created_at' | 'updated_at' | 'deleted_at'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const sql = `
      INSERT INTO product_categories
      (id, tenant_id, parent_category_id, name, slug, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    await executor.execute<mysql.ResultSetHeader>(sql, [
      category.id,
      category.tenant_id,
      category.parent_category_id,
      category.name,
      category.slug,
      category.description,
    ]);
  }

  async update(
    tenantId: string,
    categoryId: string,
    payload: Pick<ProductCategory, 'name' | 'slug' | 'parent_category_id' | 'description'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const sql = `
      UPDATE product_categories
      SET name = ?, slug = ?, parent_category_id = ?, description = ?, updated_at = NOW()
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
    `;

    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.name,
      payload.slug,
      payload.parent_category_id,
      payload.description,
      categoryId,
      tenantId,
    ]);
  }

  async findById(tenantId: string, categoryId: string): Promise<ProductCategory | null> {
    const sql = `
      SELECT *
      FROM product_categories
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
      LIMIT 1
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [categoryId, tenantId]);
    const categories = rows as ProductCategory[];
    return categories[0] ?? null;
  }

  async findByIds(tenantId: string, categoryIds: string[]): Promise<ProductCategory[]> {
    if (categoryIds.length === 0) {
      return [];
    }

    const placeholders = categoryIds.map(() => '?').join(', ');
    const sql = `
      SELECT *
      FROM product_categories
      WHERE tenant_id = ? AND deleted_at IS NULL AND id IN (${placeholders})
      ORDER BY name ASC, id ASC
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, ...categoryIds]);
    return rows as ProductCategory[];
  }

  async list(tenantId: string): Promise<ProductCategory[]> {
    const sql = `
      SELECT *
      FROM product_categories
      WHERE tenant_id = ? AND deleted_at IS NULL
      ORDER BY name ASC, id ASC
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId]);
    return rows as ProductCategory[];
  }

  async listByProductIds(
    tenantId: string,
    productIds: string[]
  ): Promise<Array<ProductCategory & { product_id: string }>> {
    if (productIds.length === 0) {
      return [];
    }

    const placeholders = productIds.map(() => '?').join(', ');
    const sql = `
      SELECT pc.*, pca.product_id
      FROM product_category_assignments pca
      INNER JOIN product_categories pc
        ON pc.id = pca.category_id
       AND pc.tenant_id = pca.tenant_id
       AND pc.deleted_at IS NULL
      WHERE pca.tenant_id = ? AND pca.product_id IN (${placeholders})
      ORDER BY pc.name ASC, pc.id ASC
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, ...productIds]);
    return rows as Array<ProductCategory & { product_id: string }>;
  }

  async existsBySlug(tenantId: string, slug: string, excludeCategoryId?: string): Promise<boolean> {
    const params: string[] = [tenantId, slug];
    let sql = `
      SELECT id
      FROM product_categories
      WHERE tenant_id = ? AND slug = ? AND deleted_at IS NULL
    `;

    if (excludeCategoryId) {
      sql += ' AND id <> ?';
      params.push(excludeCategoryId);
    }

    sql += ' LIMIT 1';
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return rows.length > 0;
  }

  async hasActiveChildren(tenantId: string, categoryId: string): Promise<boolean> {
    const sql = `
      SELECT id
      FROM product_categories
      WHERE tenant_id = ? AND parent_category_id = ? AND deleted_at IS NULL
      LIMIT 1
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, categoryId]);
    return rows.length > 0;
  }

  async isAssignedToActiveProducts(tenantId: string, categoryId: string): Promise<boolean> {
    const sql = `
      SELECT pca.product_id
      FROM product_category_assignments pca
      INNER JOIN products p
        ON p.id = pca.product_id
       AND p.tenant_id = pca.tenant_id
       AND p.deleted_at IS NULL
      WHERE pca.tenant_id = ? AND pca.category_id = ?
      LIMIT 1
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, categoryId]);
    return rows.length > 0;
  }

  async replaceAssignments(
    tenantId: string,
    productId: string,
    categoryIds: string[],
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const deleteSql = `
      DELETE FROM product_category_assignments
      WHERE tenant_id = ? AND product_id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(deleteSql, [tenantId, productId]);

    if (categoryIds.length === 0) {
      return;
    }

    const insertSql = `
      INSERT INTO product_category_assignments (product_id, category_id, tenant_id, created_at)
      VALUES (?, ?, ?, NOW())
    `;

    for (const categoryId of categoryIds) {
      await executor.execute<mysql.ResultSetHeader>(insertSql, [productId, categoryId, tenantId]);
    }
  }

  async softDelete(
    tenantId: string,
    categoryId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const sql = `
      UPDATE product_categories
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [categoryId, tenantId]);
  }
}
