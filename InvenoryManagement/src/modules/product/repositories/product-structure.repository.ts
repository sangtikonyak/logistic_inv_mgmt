import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import {
  ProductAttribute,
  ProductAttributeValue,
  ProductBundleComponent,
  ProductVariantAttributeValue,
} from '../types/product.types';

export class ProductStructureRepository {
  constructor(private readonly executor: Queryable) {}

  async createAttribute(
    attribute: ProductAttribute,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const sql = `
      INSERT INTO product_attributes
      (id, tenant_id, product_id, name, slug, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      attribute.id,
      attribute.tenant_id,
      attribute.product_id,
      attribute.name,
      attribute.slug,
      attribute.sort_order,
    ]);
  }

  async updateAttribute(
    tenantId: string,
    productId: string,
    attributeId: string,
    payload: Pick<ProductAttribute, 'name' | 'slug' | 'sort_order'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const sql = `
      UPDATE product_attributes
      SET name = ?, slug = ?, sort_order = ?, updated_at = NOW()
      WHERE id = ? AND tenant_id = ? AND product_id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.name,
      payload.slug,
      payload.sort_order,
      attributeId,
      tenantId,
      productId,
    ]);
  }

  async deleteAttribute(
    tenantId: string,
    productId: string,
    attributeId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const sql = `
      DELETE FROM product_attributes
      WHERE id = ? AND tenant_id = ? AND product_id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [attributeId, tenantId, productId]);
  }

  async createAttributeValue(
    value: ProductAttributeValue,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const sql = `
      INSERT INTO product_attribute_values
      (id, tenant_id, attribute_id, value, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      value.id,
      value.tenant_id,
      value.attribute_id,
      value.value,
      value.sort_order,
    ]);
  }

  async updateAttributeValue(
    tenantId: string,
    attributeId: string,
    valueId: string,
    payload: Pick<ProductAttributeValue, 'value' | 'sort_order'>,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const sql = `
      UPDATE product_attribute_values
      SET value = ?, sort_order = ?, updated_at = NOW()
      WHERE id = ? AND tenant_id = ? AND attribute_id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.value,
      payload.sort_order,
      valueId,
      tenantId,
      attributeId,
    ]);
  }

  async deleteAttributeValue(
    tenantId: string,
    attributeId: string,
    valueId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const sql = `
      DELETE FROM product_attribute_values
      WHERE id = ? AND tenant_id = ? AND attribute_id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [valueId, tenantId, attributeId]);
  }

  async findAttributeById(
    tenantId: string,
    productId: string,
    attributeId: string
  ): Promise<ProductAttribute | null> {
    const sql = `
      SELECT *
      FROM product_attributes
      WHERE id = ? AND tenant_id = ? AND product_id = ?
      LIMIT 1
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [attributeId, tenantId, productId]);
    const attributes = rows as ProductAttribute[];
    return attributes[0] ?? null;
  }

  async listAttributesByProductId(
    tenantId: string,
    productId: string
  ): Promise<ProductAttribute[]> {
    const sql = `
      SELECT *
      FROM product_attributes
      WHERE tenant_id = ? AND product_id = ?
      ORDER BY sort_order ASC, name ASC, id ASC
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, productId]);
    return rows as ProductAttribute[];
  }

  async existsAttributeSlug(
    tenantId: string,
    productId: string,
    slug: string,
    excludeAttributeId?: string
  ): Promise<boolean> {
    const params: string[] = [tenantId, productId, slug];
    let sql = `
      SELECT id
      FROM product_attributes
      WHERE tenant_id = ? AND product_id = ? AND slug = ?
    `;
    if (excludeAttributeId) {
      sql += ' AND id <> ?';
      params.push(excludeAttributeId);
    }
    sql += ' LIMIT 1';
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return rows.length > 0;
  }

  async findAttributeValueById(
    tenantId: string,
    attributeId: string,
    valueId: string
  ): Promise<ProductAttributeValue | null> {
    const sql = `
      SELECT *
      FROM product_attribute_values
      WHERE id = ? AND tenant_id = ? AND attribute_id = ?
      LIMIT 1
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [valueId, tenantId, attributeId]);
    const values = rows as ProductAttributeValue[];
    return values[0] ?? null;
  }

  async listAttributeValuesByAttributeId(
    tenantId: string,
    attributeId: string
  ): Promise<ProductAttributeValue[]> {
    const sql = `
      SELECT *
      FROM product_attribute_values
      WHERE tenant_id = ? AND attribute_id = ?
      ORDER BY sort_order ASC, value ASC, id ASC
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, attributeId]);
    return rows as ProductAttributeValue[];
  }

  async existsAttributeValue(
    tenantId: string,
    attributeId: string,
    value: string,
    excludeValueId?: string
  ): Promise<boolean> {
    const params: string[] = [tenantId, attributeId, value];
    let sql = `
      SELECT id
      FROM product_attribute_values
      WHERE tenant_id = ? AND attribute_id = ? AND value = ?
    `;
    if (excludeValueId) {
      sql += ' AND id <> ?';
      params.push(excludeValueId);
    }
    sql += ' LIMIT 1';
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return rows.length > 0;
  }

  async isAttributeUsedByVariants(
    tenantId: string,
    productId: string,
    attributeId: string
  ): Promise<boolean> {
    const sql = `
      SELECT pvav.variant_id
      FROM product_variant_attribute_values pvav
      INNER JOIN product_variants pv
        ON pv.id = pvav.variant_id
       AND pv.tenant_id = pvav.tenant_id
       AND pv.deleted_at IS NULL
      WHERE pvav.tenant_id = ? AND pv.product_id = ? AND pvav.attribute_id = ?
      LIMIT 1
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, productId, attributeId]);
    return rows.length > 0;
  }

  async isAttributeValueUsedByVariants(
    tenantId: string,
    productId: string,
    attributeId: string,
    valueId: string
  ): Promise<boolean> {
    const sql = `
      SELECT pvav.variant_id
      FROM product_variant_attribute_values pvav
      INNER JOIN product_variants pv
        ON pv.id = pvav.variant_id
       AND pv.tenant_id = pvav.tenant_id
       AND pv.deleted_at IS NULL
      WHERE pvav.tenant_id = ?
        AND pv.product_id = ?
        AND pvav.attribute_id = ?
        AND pvav.attribute_value_id = ?
      LIMIT 1
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [
      tenantId,
      productId,
      attributeId,
      valueId,
    ]);
    return rows.length > 0;
  }

  async replaceBundleComponents(
    tenantId: string,
    bundleProductId: string,
    components: ProductBundleComponent[],
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const deleteSql = `
      DELETE FROM product_bundle_components
      WHERE tenant_id = ? AND bundle_product_id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(deleteSql, [tenantId, bundleProductId]);

    if (components.length === 0) {
      return;
    }

    const insertSql = `
      INSERT INTO product_bundle_components
      (
        id, tenant_id, bundle_product_id, component_product_id,
        component_variant_id, quantity, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    for (const component of components) {
      await executor.execute<mysql.ResultSetHeader>(insertSql, [
        component.id,
        component.tenant_id,
        component.bundle_product_id,
        component.component_product_id,
        component.component_variant_id,
        component.quantity,
      ]);
    }
  }

  async listBundleComponents(
    tenantId: string,
    bundleProductId: string
  ): Promise<ProductBundleComponent[]> {
    const sql = `
      SELECT *
      FROM product_bundle_components
      WHERE tenant_id = ? AND bundle_product_id = ?
      ORDER BY id ASC
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, bundleProductId]);
    return rows as ProductBundleComponent[];
  }

  async replaceVariantAttributes(
    tenantId: string,
    productId: string,
    variants: Array<{
      variantId: string;
      attributes: Array<{ name: string; value: string }>;
    }>,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const deleteVariantValuesSql = `
      DELETE pvav
      FROM product_variant_attribute_values pvav
      INNER JOIN product_variants pv
        ON pv.id = pvav.variant_id
       AND pv.tenant_id = pvav.tenant_id
      WHERE pvav.tenant_id = ? AND pv.product_id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(deleteVariantValuesSql, [tenantId, productId]);

    const deleteAttributeValuesSql = `
      DELETE pav
      FROM product_attribute_values pav
      INNER JOIN product_attributes pa
        ON pa.id = pav.attribute_id
       AND pa.tenant_id = pav.tenant_id
      WHERE pav.tenant_id = ? AND pa.product_id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(deleteAttributeValuesSql, [tenantId, productId]);

    const deleteAttributesSql = `
      DELETE FROM product_attributes
      WHERE tenant_id = ? AND product_id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(deleteAttributesSql, [tenantId, productId]);

    if (variants.length === 0) {
      return;
    }

    const attributeBySlug = new Map<string, ProductAttribute>();
    const attributeValueByKey = new Map<string, ProductAttributeValue>();
    let attributeSortOrder = 0;

    const insertAttributeSql = `
      INSERT INTO product_attributes
      (id, tenant_id, product_id, name, slug, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    const insertAttributeValueSql = `
      INSERT INTO product_attribute_values
      (id, tenant_id, attribute_id, value, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `;
    const insertVariantAttributeValueSql = `
      INSERT INTO product_variant_attribute_values
      (variant_id, attribute_id, attribute_value_id, tenant_id, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `;

    for (const variant of variants) {
      for (const attribute of variant.attributes) {
        const slug = this.slugify(attribute.name);
        let storedAttribute = attributeBySlug.get(slug);

        if (!storedAttribute) {
          storedAttribute = {
            id: uuidv4(),
            tenant_id: tenantId,
            product_id: productId,
            name: attribute.name,
            slug,
            sort_order: attributeSortOrder,
          };
          attributeSortOrder += 1;

          await executor.execute<mysql.ResultSetHeader>(insertAttributeSql, [
            storedAttribute.id,
            storedAttribute.tenant_id,
            storedAttribute.product_id,
            storedAttribute.name,
            storedAttribute.slug,
            storedAttribute.sort_order,
          ]);
          attributeBySlug.set(slug, storedAttribute);
        }

        const valueKey = `${storedAttribute.id}:${attribute.value.toLowerCase()}`;
        let storedValue = attributeValueByKey.get(valueKey);

        if (!storedValue) {
          storedValue = {
            id: uuidv4(),
            tenant_id: tenantId,
            attribute_id: storedAttribute.id,
            value: attribute.value,
            sort_order: 0,
          };
          await executor.execute<mysql.ResultSetHeader>(insertAttributeValueSql, [
            storedValue.id,
            storedValue.tenant_id,
            storedValue.attribute_id,
            storedValue.value,
            storedValue.sort_order,
          ]);
          attributeValueByKey.set(valueKey, storedValue);
        }

        const variantAttributeValue: ProductVariantAttributeValue = {
          variant_id: variant.variantId,
          attribute_id: storedAttribute.id,
          attribute_value_id: storedValue.id,
          tenant_id: tenantId,
        };

        await executor.execute<mysql.ResultSetHeader>(insertVariantAttributeValueSql, [
          variantAttributeValue.variant_id,
          variantAttributeValue.attribute_id,
          variantAttributeValue.attribute_value_id,
          variantAttributeValue.tenant_id,
        ]);
      }
    }
  }

  async listVariantAttributes(
    tenantId: string,
    productId: string
  ): Promise<Array<mysql.RowDataPacket>> {
    const sql = `
      SELECT
        pv.id AS variant_id,
        pa.name AS attribute_name,
        pav.value AS attribute_value
      FROM product_variant_attribute_values pvav
      INNER JOIN product_variants pv
        ON pv.id = pvav.variant_id
       AND pv.tenant_id = pvav.tenant_id
       AND pv.deleted_at IS NULL
      INNER JOIN product_attributes pa
        ON pa.id = pvav.attribute_id
       AND pa.tenant_id = pvav.tenant_id
      INNER JOIN product_attribute_values pav
        ON pav.id = pvav.attribute_value_id
       AND pav.tenant_id = pvav.tenant_id
      WHERE pvav.tenant_id = ? AND pv.product_id = ?
      ORDER BY pv.sort_order ASC, pa.sort_order ASC, pav.value ASC
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, productId]);
    return rows;
  }

  private slugify(value: string): string {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    return slug.length > 0 ? slug : 'attribute';
  }
}
