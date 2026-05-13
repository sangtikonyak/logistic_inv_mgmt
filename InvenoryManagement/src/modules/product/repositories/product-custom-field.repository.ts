import mysql from 'mysql2/promise';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import { ProductCustomFieldDefinition } from '../types/product.types';

export interface ProductFieldValueWrite {
  id: string;
  tenantId: string;
  definitionId: string;
  productId: string | null;
  variantId: string | null;
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  valueDate: string | null;
  valueJson: string | null;
}

export class ProductCustomFieldRepository {
  constructor(private readonly executor: Queryable) {}

  async createDefinition(
    definition: {
      id: string;
      tenant_id: string;
      name: string;
      field_key: string;
      field_type: ProductCustomFieldDefinition['field_type'];
      applies_to: ProductCustomFieldDefinition['applies_to'];
      is_required: number;
      allowed_values_json: string | null;
      validation_rules_json: string | null;
      sort_order: number;
    },
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const sql = `
      INSERT INTO product_custom_field_definitions
      (
        id, tenant_id, name, field_key, field_type, applies_to,
        is_required, allowed_values_json, validation_rules_json, sort_order,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    await executor.execute<mysql.ResultSetHeader>(sql, [
      definition.id,
      definition.tenant_id,
      definition.name,
      definition.field_key,
      definition.field_type,
      definition.applies_to,
      definition.is_required,
      definition.allowed_values_json,
      definition.validation_rules_json,
      definition.sort_order,
    ]);
  }

  async updateDefinition(
    tenantId: string,
    definitionId: string,
    payload: {
      name: string;
      field_key: string;
      field_type: ProductCustomFieldDefinition['field_type'];
      applies_to: ProductCustomFieldDefinition['applies_to'];
      is_required: number;
      allowed_values_json: string | null;
      validation_rules_json: string | null;
      sort_order: number;
    },
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const sql = `
      UPDATE product_custom_field_definitions
      SET
        name = ?,
        field_key = ?,
        field_type = ?,
        applies_to = ?,
        is_required = ?,
        allowed_values_json = ?,
        validation_rules_json = ?,
        sort_order = ?,
        updated_at = NOW()
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
    `;

    await executor.execute<mysql.ResultSetHeader>(sql, [
      payload.name,
      payload.field_key,
      payload.field_type,
      payload.applies_to,
      payload.is_required,
      payload.allowed_values_json,
      payload.validation_rules_json,
      payload.sort_order,
      definitionId,
      tenantId,
    ]);
  }

  async findDefinitionById(
    tenantId: string,
    definitionId: string
  ): Promise<ProductCustomFieldDefinition | null> {
    const sql = `
      SELECT *
      FROM product_custom_field_definitions
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
      LIMIT 1
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [definitionId, tenantId]);
    const definitions = rows as ProductCustomFieldDefinition[];
    return definitions[0] ?? null;
  }

  async findDefinitionsByIds(
    tenantId: string,
    definitionIds: string[]
  ): Promise<ProductCustomFieldDefinition[]> {
    if (definitionIds.length === 0) {
      return [];
    }

    const placeholders = definitionIds.map(() => '?').join(', ');
    const sql = `
      SELECT *
      FROM product_custom_field_definitions
      WHERE tenant_id = ? AND deleted_at IS NULL AND id IN (${placeholders})
      ORDER BY sort_order ASC, name ASC, id ASC
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [
      tenantId,
      ...definitionIds,
    ]);
    return rows as ProductCustomFieldDefinition[];
  }

  async listDefinitions(tenantId: string): Promise<ProductCustomFieldDefinition[]> {
    const sql = `
      SELECT *
      FROM product_custom_field_definitions
      WHERE tenant_id = ? AND deleted_at IS NULL
      ORDER BY sort_order ASC, name ASC, id ASC
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId]);
    return rows as ProductCustomFieldDefinition[];
  }

  async listRequiredDefinitions(
    tenantId: string,
    appliesTo: Array<ProductCustomFieldDefinition['applies_to']>
  ): Promise<ProductCustomFieldDefinition[]> {
    const placeholders = appliesTo.map(() => '?').join(', ');
    const sql = `
      SELECT *
      FROM product_custom_field_definitions
      WHERE tenant_id = ? AND deleted_at IS NULL AND is_required = 1 AND applies_to IN (${placeholders})
      ORDER BY sort_order ASC, name ASC, id ASC
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, ...appliesTo]);
    return rows as ProductCustomFieldDefinition[];
  }

  async existsByFieldKey(
    tenantId: string,
    fieldKey: string,
    excludeDefinitionId?: string
  ): Promise<boolean> {
    const params: string[] = [tenantId, fieldKey];
    let sql = `
      SELECT id
      FROM product_custom_field_definitions
      WHERE tenant_id = ? AND field_key = ? AND deleted_at IS NULL
    `;

    if (excludeDefinitionId) {
      sql += ' AND id <> ?';
      params.push(excludeDefinitionId);
    }

    sql += ' LIMIT 1';
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, params);
    return rows.length > 0;
  }

  async hasAnyValues(tenantId: string, definitionId: string): Promise<boolean> {
    const sql = `
      SELECT id
      FROM product_custom_field_values
      WHERE tenant_id = ? AND definition_id = ?
      LIMIT 1
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, definitionId]);
    return rows.length > 0;
  }

  async softDeleteDefinition(
    tenantId: string,
    definitionId: string,
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const sql = `
      UPDATE product_custom_field_definitions
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
    `;
    await executor.execute<mysql.ResultSetHeader>(sql, [definitionId, tenantId]);
  }

  async replaceProductValues(
    tenantId: string,
    productId: string,
    values: ProductFieldValueWrite[],
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const deleteSql = `
      DELETE FROM product_custom_field_values
      WHERE tenant_id = ? AND product_id = ? AND variant_id IS NULL
    `;
    await executor.execute<mysql.ResultSetHeader>(deleteSql, [tenantId, productId]);
    await this.insertValues(values, executor);
  }

  async replaceVariantValues(
    tenantId: string,
    variantId: string,
    values: ProductFieldValueWrite[],
    executor: Queryable | DatabaseTransaction = this.executor
  ): Promise<void> {
    const deleteSql = `
      DELETE FROM product_custom_field_values
      WHERE tenant_id = ? AND variant_id = ?
    `;
    await executor.execute<mysql.ResultSetHeader>(deleteSql, [tenantId, variantId]);
    await this.insertValues(values, executor);
  }

  async listProductValues(tenantId: string, productId: string): Promise<mysql.RowDataPacket[]> {
    const sql = `
      SELECT
        v.*,
        d.name AS definition_name,
        d.field_key,
        d.field_type,
        d.applies_to
      FROM product_custom_field_values v
      INNER JOIN product_custom_field_definitions d
        ON d.id = v.definition_id
       AND d.tenant_id = v.tenant_id
      WHERE v.tenant_id = ? AND v.product_id = ? AND v.variant_id IS NULL
      ORDER BY d.sort_order ASC, d.name ASC, d.id ASC
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, productId]);
    return rows;
  }

  async listVariantValuesByProduct(
    tenantId: string,
    productId: string
  ): Promise<Array<mysql.RowDataPacket>> {
    const sql = `
      SELECT
        v.*,
        d.name AS definition_name,
        d.field_key,
        d.field_type,
        d.applies_to
      FROM product_custom_field_values v
      INNER JOIN product_variants pv
        ON pv.id = v.variant_id
       AND pv.tenant_id = v.tenant_id
       AND pv.deleted_at IS NULL
      INNER JOIN product_custom_field_definitions d
        ON d.id = v.definition_id
       AND d.tenant_id = v.tenant_id
      WHERE v.tenant_id = ? AND v.product_id = ? AND v.variant_id IS NOT NULL
      ORDER BY d.sort_order ASC, d.name ASC, d.id ASC
    `;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, productId]);
    return rows as mysql.RowDataPacket[];
  }

  private async insertValues(
    values: ProductFieldValueWrite[],
    executor: Queryable | DatabaseTransaction
  ): Promise<void> {
    if (values.length === 0) {
      return;
    }

    const sql = `
      INSERT INTO product_custom_field_values
      (
        id, tenant_id, definition_id, product_id, variant_id,
        value_text, value_number, value_boolean, value_date, value_json,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    for (const value of values) {
      await executor.execute<mysql.ResultSetHeader>(sql, [
        value.id,
        value.tenantId,
        value.definitionId,
        value.productId,
        value.variantId,
        value.valueText,
        value.valueNumber,
        value.valueBoolean === null ? null : value.valueBoolean ? 1 : 0,
        value.valueDate,
        value.valueJson,
      ]);
    }
  }
}
