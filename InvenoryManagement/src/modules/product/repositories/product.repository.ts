import mysql from 'mysql2/promise';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import {
  Product,
  ProductListFilters,
  ProductListRow,
  ProductVariant,
} from '../types/product.types';

export class ProductRepository {
  constructor(private readonly executor: Queryable) {}

  async create(
    product: Omit<Product, 'created_at' | 'updated_at' | 'deleted_at'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const sql = `
      INSERT INTO products
      (
        id, tenant_id, unit_id, name, slug, description,
        product_type, status, sku, barcode,
        is_sellable, is_purchasable, track_inventory, allow_returns, allow_backorder,
        min_stock_level, max_stock_level, cost_price, selling_price, currency_code,
        created_by, updated_by,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    try {
      await executor.query<mysql.ResultSetHeader>(sql, [
        product.id,
        product.tenant_id,
        product.unit_id,
        product.name,
        product.slug,
        product.description,
        product.product_type,
        product.status,
        product.sku,
        product.barcode,
        Number(product.is_sellable),
        Number(product.is_purchasable),
        Number(product.track_inventory),
        Number(product.allow_returns),
        Number(product.allow_backorder),
        product.min_stock_level,
        product.max_stock_level,
        product.cost_price,
        product.selling_price,
        product.currency_code,
        product.created_by,
        product.updated_by,
      ]);
    } catch (error) {
      console.error('ProductRepository.create Error:', error);
      throw error;
    }
  }

  async update(
    tenantId: string,
    productId: string,
    payload: Pick<
      Product,
      | 'unit_id'
      | 'name'
      | 'slug'
      | 'description'
      | 'product_type'
      | 'status'
      | 'sku'
      | 'barcode'
      | 'is_sellable'
      | 'is_purchasable'
      | 'track_inventory'
      | 'allow_returns'
      | 'allow_backorder'
      | 'min_stock_level'
      | 'max_stock_level'
      | 'cost_price'
      | 'selling_price'
      | 'currency_code'
      | 'updated_by'
    >,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const sql = `
      UPDATE products
      SET
        unit_id = ?,
        name = ?,
        slug = ?,
        description = ?,
        product_type = ?,
        status = ?,
        sku = ?,
        barcode = ?,
        is_sellable = ?,
        is_purchasable = ?,
        track_inventory = ?,
        allow_returns = ?,
        allow_backorder = ?,
        min_stock_level = ?,
        max_stock_level = ?,
        cost_price = ?,
        selling_price = ?,
        currency_code = ?,
        updated_by = ?,
        updated_at = NOW()
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
    `;
    try {
      await executor.query<mysql.ResultSetHeader>(sql, [
        payload.unit_id,
        payload.name,
        payload.slug,
        payload.description,
        payload.product_type,
        payload.status,
        payload.sku,
        payload.barcode,
        Number(payload.is_sellable),
        Number(payload.is_purchasable),
        Number(payload.track_inventory),
        Number(payload.allow_returns),
        Number(payload.allow_backorder),
        payload.min_stock_level,
        payload.max_stock_level,
        payload.cost_price,
        payload.selling_price,
        payload.currency_code,
        payload.updated_by,
        productId,
        tenantId,
      ]);
    } catch (error) {
      console.error('ProductRepository.update Error:', error);
      throw error;
    }
  }

  async findById(tenantId: string, productId: string): Promise<Product | null> {
    const sql = `
      SELECT *
      FROM products
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
      LIMIT 1
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [productId, tenantId]);
    const products = rows as Product[];
    return products[0] ?? null;
  }

  async findBySlug(tenantId: string, slug: string, excludeProductId?: string): Promise<boolean> {
    const params: string[] = [tenantId, slug];
    let sql = `
      SELECT id
      FROM products
      WHERE tenant_id = ? AND slug = ? AND deleted_at IS NULL
    `;
    if (excludeProductId) {
      sql += ' AND id <> ?';
      params.push(excludeProductId);
    }
    sql += ' LIMIT 1';
    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, params);
    return rows.length > 0;
  }

  async list(tenantId: string, filters: ProductListFilters): Promise<ProductListRow[]> {
    const productIds = await this.listPageIds(tenantId, filters);
    if (productIds.length === 0) {
      return [];
    }

    return this.listByIds(tenantId, productIds);
  }

  async count(tenantId: string, filters: ProductListFilters): Promise<number> {
    const { whereClause, params } = this.buildListFilterSql(tenantId, filters);
    const sql = `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM products p
      ${whereClause}
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    const total = rows[0] as { total: number } | undefined;
    return total?.total ?? 0;
  }

  private async listPageIds(tenantId: string, filters: ProductListFilters): Promise<string[]> {
    const { whereClause, params } = this.buildListFilterSql(tenantId, filters);
    const limit = Number(filters.limit);
    const offset = (Number(filters.page) - 1) * limit;
    const sql = `
      SELECT
        p.id
      FROM products p
      ${whereClause}
      ORDER BY p.${filters.sortBy} ${filters.sortDir}, p.id ${filters.sortDir}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await this.executor.query<mysql.RowDataPacket[]>(sql, params);
    return rows.map((row) => String(row.id));
  }

  private async listByIds(tenantId: string, productIds: string[]): Promise<ProductListRow[]> {
    const placeholders = productIds.map(() => '?').join(', ');
    const sql = `
      SELECT
        p.*,
        u.name AS unit_name,
        u.code AS unit_code,
        category_summary.category_ids,
        category_summary.category_names,
        COALESCE(variant_summary.variant_count, 0) AS variant_count
      FROM products p
      LEFT JOIN product_units u
        ON u.id = p.unit_id
       AND u.tenant_id = p.tenant_id
       AND u.deleted_at IS NULL
      LEFT JOIN (
        SELECT
          pca.product_id,
          GROUP_CONCAT(pc.id ORDER BY pc.name ASC SEPARATOR ',') AS category_ids,
          GROUP_CONCAT(pc.name ORDER BY pc.name ASC SEPARATOR ',') AS category_names
        FROM product_category_assignments pca
        INNER JOIN product_categories pc
          ON pc.id = pca.category_id
         AND pc.tenant_id = pca.tenant_id
         AND pc.deleted_at IS NULL
        WHERE pca.tenant_id = ?
          AND pca.product_id IN (${placeholders})
        GROUP BY pca.product_id
      ) AS category_summary
        ON category_summary.product_id = p.id
      LEFT JOIN (
        SELECT
          pv.product_id,
          COUNT(*) AS variant_count
        FROM product_variants pv
        WHERE pv.tenant_id = ?
          AND pv.deleted_at IS NULL
          AND pv.product_id IN (${placeholders})
        GROUP BY pv.product_id
      ) AS variant_summary
        ON variant_summary.product_id = p.id
      WHERE p.tenant_id = ?
        AND p.deleted_at IS NULL
        AND p.id IN (${placeholders})
      ORDER BY FIELD(p.id, ${placeholders})
    `;
    const queryParams = [
      tenantId,
      ...productIds,
      tenantId,
      ...productIds,
      tenantId,
      ...productIds,
      ...productIds,
    ];
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, queryParams);
    return rows as ProductListRow[];
  }

  async listVariantsByProductId(tenantId: string, productId: string): Promise<ProductVariant[]> {
    const sql = `
      SELECT *
      FROM product_variants
      WHERE tenant_id = ? AND product_id = ? AND deleted_at IS NULL
      ORDER BY sort_order ASC, name ASC, id ASC
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, productId]);
    return rows as ProductVariant[];
  }

  async findVariantById(
    tenantId: string,
    productId: string,
    variantId: string
  ): Promise<ProductVariant | null> {
    const sql = `
      SELECT *
      FROM product_variants
      WHERE id = ? AND product_id = ? AND tenant_id = ? AND deleted_at IS NULL
      LIMIT 1
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [
      variantId,
      productId,
      tenantId,
    ]);
    const variants = rows as ProductVariant[];
    return variants[0] ?? null;
  }

  async createVariant(
    variant: Omit<ProductVariant, 'created_at' | 'updated_at' | 'deleted_at'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const sql = `
      INSERT INTO product_variants
      (
        id, tenant_id, product_id, unit_id, name, sku, barcode,
        cost_price, selling_price, currency_code,
        attributes_json, attribute_signature, sort_order, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    try {
      await executor.query<mysql.ResultSetHeader>(sql, [
        variant.id,
        variant.tenant_id,
        variant.product_id,
        variant.unit_id,
        variant.name,
        variant.sku,
        variant.barcode,
        variant.cost_price,
        variant.selling_price,
        variant.currency_code,
        variant.attributes_json,
        variant.attribute_signature,
        variant.sort_order,
      ]);
    } catch (error) {
      console.error('ProductRepository.createVariant Error:', error);
      throw error;
    }
  }

  async updateVariant(
    tenantId: string,
    productId: string,
    variantId: string,
    payload: Pick<
      ProductVariant,
      | 'unit_id'
      | 'name'
      | 'sku'
      | 'barcode'
      | 'cost_price'
      | 'selling_price'
      | 'currency_code'
      | 'attributes_json'
      | 'attribute_signature'
      | 'sort_order'
    >,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const sql = `
      UPDATE product_variants
      SET
        unit_id = ?,
        name = ?,
        sku = ?,
        barcode = ?,
        cost_price = ?,
        selling_price = ?,
        currency_code = ?,
        attributes_json = ?,
        attribute_signature = ?,
        sort_order = ?,
        updated_at = NOW()
      WHERE id = ? AND product_id = ? AND tenant_id = ? AND deleted_at IS NULL
    `;
    try {
      await executor.query<mysql.ResultSetHeader>(sql, [
        payload.unit_id,
        payload.name,
        payload.sku,
        payload.barcode,
        payload.cost_price,
        payload.selling_price,
        payload.currency_code,
        payload.attributes_json,
        payload.attribute_signature,
        payload.sort_order,
        variantId,
        productId,
        tenantId,
      ]);
    } catch (error) {
      console.error('ProductRepository.updateVariant Error:', error);
      throw error;
    }
  }

  async softDeleteMissingVariants(
    tenantId: string,
    productId: string,
    keepVariantIds: string[],
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    let sql = `
      UPDATE product_variants
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE tenant_id = ? AND product_id = ? AND deleted_at IS NULL
    `;
    const params: string[] = [tenantId, productId];

    if (keepVariantIds.length > 0) {
      const placeholders = keepVariantIds.map(() => '?').join(', ');
      sql += ` AND id NOT IN (${placeholders})`;
      params.push(...keepVariantIds);
    }

    await executor.execute<mysql.ResultSetHeader>(sql, params);
  }

  async softDeleteProduct(
    tenantId: string,
    productId: string,
    deletedBy: string | null,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const productSql = `
      UPDATE products
      SET deleted_at = NOW(), deleted_by = ?, updated_at = NOW()
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
    `;
    const variantSql = `
      UPDATE product_variants
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE product_id = ? AND tenant_id = ? AND deleted_at IS NULL
    `;
    await executor.execute<mysql.ResultSetHeader>(productSql, [deletedBy, productId, tenantId]);
    await executor.execute<mysql.ResultSetHeader>(variantSql, [productId, tenantId]);
  }

  async findVariantByIdOnly(tenantId: string, variantId: string): Promise<ProductVariant | null> {
    const sql = `
      SELECT *
      FROM product_variants
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
      LIMIT 1
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [variantId, tenantId]);
    const variants = rows as ProductVariant[];
    return variants[0] ?? null;
  }

  async existsSkuConflict(
    tenantId: string,
    sku: string,
    excludeProductId?: string,
    excludeVariantId?: string
  ): Promise<boolean> {
    const productParams: string[] = [tenantId, sku];
    let productSql = `
      SELECT id
      FROM products
      WHERE tenant_id = ? AND sku = ? AND deleted_at IS NULL
    `;
    if (excludeProductId) {
      productSql += ' AND id <> ?';
      productParams.push(excludeProductId);
    }
    productSql += ' LIMIT 1';
    const [productRows] = await this.executor.execute<mysql.RowDataPacket[]>(productSql, productParams);
    if (productRows.length > 0) {
      return true;
    }

    const variantParams: string[] = [tenantId, sku];
    let variantSql = `
      SELECT id
      FROM product_variants
      WHERE tenant_id = ? AND sku = ? AND deleted_at IS NULL
    `;
    if (excludeVariantId) {
      variantSql += ' AND id <> ?';
      variantParams.push(excludeVariantId);
    }
    variantSql += ' LIMIT 1';
    const [variantRows] = await this.executor.execute<mysql.RowDataPacket[]>(variantSql, variantParams);
    return variantRows.length > 0;
  }

  async existsBarcodeConflict(
    tenantId: string,
    barcode: string,
    excludeProductId?: string,
    excludeVariantId?: string
  ): Promise<boolean> {
    const productParams: string[] = [tenantId, barcode];
    let productSql = `
      SELECT id
      FROM products
      WHERE tenant_id = ? AND barcode = ? AND deleted_at IS NULL
    `;
    if (excludeProductId) {
      productSql += ' AND id <> ?';
      productParams.push(excludeProductId);
    }
    productSql += ' LIMIT 1';
    const [productRows] = await this.executor.execute<mysql.RowDataPacket[]>(productSql, productParams);
    if (productRows.length > 0) {
      return true;
    }

    const variantParams: string[] = [tenantId, barcode];
    let variantSql = `
      SELECT id
      FROM product_variants
      WHERE tenant_id = ? AND barcode = ? AND deleted_at IS NULL
    `;
    if (excludeVariantId) {
      variantSql += ' AND id <> ?';
      variantParams.push(excludeVariantId);
    }
    variantSql += ' LIMIT 1';
    const [variantRows] = await this.executor.execute<mysql.RowDataPacket[]>(variantSql, variantParams);
    return variantRows.length > 0;
  }

  private buildListFilterSql(tenantId: string, filters: ProductListFilters): {
    whereClause: string;
    params: Array<string | number>;
  } {
    const conditions = ['p.tenant_id = ?', 'p.deleted_at IS NULL'];
    const params: Array<string | number> = [tenantId];

    if (filters.search) {
      conditions.push(
        `(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR EXISTS (
          SELECT 1
          FROM product_variants pv_search
          WHERE pv_search.product_id = p.id
            AND pv_search.tenant_id = p.tenant_id
            AND pv_search.deleted_at IS NULL
            AND (pv_search.name LIKE ? OR pv_search.sku LIKE ? OR pv_search.barcode LIKE ?)
        ))`
      );
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filters.categoryId) {
      conditions.push(
        `EXISTS (
          SELECT 1
          FROM product_category_assignments pca_filter
          WHERE pca_filter.product_id = p.id
            AND pca_filter.tenant_id = p.tenant_id
            AND pca_filter.category_id = ?
        )`
      );
      params.push(filters.categoryId);
    }

    if (filters.unitId) {
      conditions.push('p.unit_id = ?');
      params.push(filters.unitId);
    }

    if (filters.productType) {
      conditions.push('p.product_type = ?');
      params.push(filters.productType);
    }

    if (filters.status) {
      conditions.push('p.status = ?');
      params.push(filters.status);
    }

    if (filters.isSellable !== undefined) {
      conditions.push('p.is_sellable = ?');
      params.push(filters.isSellable ? 1 : 0);
    }

    if (filters.isPurchasable !== undefined) {
      conditions.push('p.is_purchasable = ?');
      params.push(filters.isPurchasable ? 1 : 0);
    }

    return {
      whereClause: `WHERE ${conditions.join(' AND ')}`,
      params,
    };
  }
}
