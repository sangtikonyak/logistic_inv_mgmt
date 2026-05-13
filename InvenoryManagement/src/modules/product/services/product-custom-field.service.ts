import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../common/exceptions/app-error';
import { Queryable } from '../../../database/database.types';
import { ProductCustomFieldRepository } from '../repositories/product-custom-field.repository';
import { ProductFieldAppliesTo, ProductFieldType } from '../types/product.types';

interface FieldDefinitionInput {
  name?: string;
  fieldKey?: string;
  fieldType?: ProductFieldType;
  appliesTo?: ProductFieldAppliesTo;
  isRequired?: boolean;
  allowedValues?: string[];
  validationRules?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  sortOrder?: number;
}

export class ProductCustomFieldService {
  private readonly fieldRepository: ProductCustomFieldRepository;

  constructor(db: Queryable) {
    this.fieldRepository = new ProductCustomFieldRepository(db);
  }

  async createDefinition(
    tenantId: string,
    input: {
      name: string;
      fieldKey: string;
      fieldType: ProductFieldType;
      appliesTo: ProductFieldAppliesTo;
      isRequired: boolean;
      allowedValues?: string[];
      validationRules?: FieldDefinitionInput['validationRules'];
      sortOrder: number;
    }
  ) {
    const normalized = this.normalizeDefinitionInput(input);

    if (await this.fieldRepository.existsByFieldKey(tenantId, normalized.fieldKey)) {
      throw new AppError('A custom field with this key already exists for the tenant', 409);
    }

    await this.fieldRepository.createDefinition({
      id: uuidv4(),
      tenant_id: tenantId,
      name: normalized.name,
      field_key: normalized.fieldKey,
      field_type: normalized.fieldType,
      applies_to: normalized.appliesTo,
      is_required: normalized.isRequired ? 1 : 0,
      allowed_values_json: normalized.allowedValues ? JSON.stringify(normalized.allowedValues) : null,
      validation_rules_json: normalized.validationRules
        ? JSON.stringify(normalized.validationRules)
        : null,
      sort_order: normalized.sortOrder,
    });

    return this.listDefinitions(tenantId);
  }

  async updateDefinition(tenantId: string, definitionId: string, input: FieldDefinitionInput) {
    const existingDefinition = await this.fieldRepository.findDefinitionById(tenantId, definitionId);
    if (!existingDefinition) {
      throw new AppError('Custom field definition not found', 404);
    }

    const normalized = this.normalizeDefinitionInput({
      name: input.name ?? existingDefinition.name,
      fieldKey: input.fieldKey ?? existingDefinition.field_key,
      fieldType: input.fieldType ?? existingDefinition.field_type,
      appliesTo: input.appliesTo ?? existingDefinition.applies_to,
      isRequired: input.isRequired ?? existingDefinition.is_required === 1,
      allowedValues:
        input.allowedValues ??
        (existingDefinition.allowed_values_json
          ? (this.parseStoredJsonValue(existingDefinition.allowed_values_json) as string[])
          : undefined),
      validationRules:
        input.validationRules ??
        (existingDefinition.validation_rules_json
          ? (this.parseStoredJsonValue(
              existingDefinition.validation_rules_json
            ) as FieldDefinitionInput['validationRules'])
          : undefined),
      sortOrder: input.sortOrder ?? existingDefinition.sort_order,
    });

    if (await this.fieldRepository.existsByFieldKey(tenantId, normalized.fieldKey, definitionId)) {
      throw new AppError('A custom field with this key already exists for the tenant', 409);
    }

    await this.fieldRepository.updateDefinition(tenantId, definitionId, {
      name: normalized.name,
      field_key: normalized.fieldKey,
      field_type: normalized.fieldType,
      applies_to: normalized.appliesTo,
      is_required: normalized.isRequired ? 1 : 0,
      allowed_values_json: normalized.allowedValues ? JSON.stringify(normalized.allowedValues) : null,
      validation_rules_json: normalized.validationRules
        ? JSON.stringify(normalized.validationRules)
        : null,
      sort_order: normalized.sortOrder,
    });

    return this.fieldRepository.findDefinitionById(tenantId, definitionId);
  }

  async listDefinitions(tenantId: string) {
    const definitions = await this.fieldRepository.listDefinitions(tenantId);
    return definitions.map((definition) => ({
      id: definition.id,
      name: definition.name,
      fieldKey: definition.field_key,
      fieldType: definition.field_type,
      appliesTo: definition.applies_to,
      isRequired: definition.is_required === 1,
      allowedValues: definition.allowed_values_json
        ? (this.parseStoredJsonValue(definition.allowed_values_json) as string[])
        : null,
      validationRules: definition.validation_rules_json
        ? this.parseStoredJsonValue(definition.validation_rules_json)
        : null,
      sortOrder: definition.sort_order,
    }));
  }

  async deleteDefinition(tenantId: string, definitionId: string) {
    const existingDefinition = await this.fieldRepository.findDefinitionById(tenantId, definitionId);
    if (!existingDefinition) {
      throw new AppError('Custom field definition not found', 404);
    }

    if (await this.fieldRepository.hasAnyValues(tenantId, definitionId)) {
      throw new AppError(
        'Custom field definition cannot be deleted while values still exist for products or variants',
        409
      );
    }

    await this.fieldRepository.softDeleteDefinition(tenantId, definitionId);
    return { definitionId };
  }

  private normalizeDefinitionInput(input: {
    name: string;
    fieldKey: string;
    fieldType: ProductFieldType;
    appliesTo: ProductFieldAppliesTo;
    isRequired: boolean;
    allowedValues?: string[];
    validationRules?: FieldDefinitionInput['validationRules'];
    sortOrder: number;
  }) {
    const name = input.name.trim().replace(/\s+/g, ' ');
    const fieldKey = this.normalizeFieldKey(input.fieldKey);
    const allowedValues = input.allowedValues?.map((value) => value.trim()).filter((value) => value.length > 0);
    const validationRules = input.validationRules ?? undefined;

    if ((input.fieldType === 'SELECT' || input.fieldType === 'MULTI_SELECT') && (!allowedValues || allowedValues.length === 0)) {
      throw new AppError('Select field types require non-empty allowed values', 400);
    }

    if (input.fieldType !== 'SELECT' && input.fieldType !== 'MULTI_SELECT' && allowedValues && allowedValues.length > 0) {
      throw new AppError('Allowed values are only supported for SELECT and MULTI_SELECT fields', 400);
    }

    if (validationRules?.pattern) {
      try {
        new RegExp(validationRules.pattern);
      } catch {
        throw new AppError('Validation rule pattern must be a valid regular expression', 400);
      }
    }

    return {
      name,
      fieldKey,
      fieldType: input.fieldType,
      appliesTo: input.appliesTo,
      isRequired: input.isRequired,
      allowedValues: allowedValues && allowedValues.length > 0 ? allowedValues : undefined,
      validationRules,
      sortOrder: input.sortOrder,
    };
  }

  private normalizeFieldKey(value: string): string {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_{2,}/g, '_');

    if (normalized.length === 0) {
      throw new AppError('Field key must contain at least one alphanumeric character', 400);
    }

    return normalized;
  }

  private parseStoredJsonValue<T>(value: unknown): T {
    if (value === null || value === undefined) {
      return value as T;
    }

    if (typeof value === 'string') {
      return JSON.parse(value) as T;
    }

    if (Buffer.isBuffer(value)) {
      return JSON.parse(value.toString('utf8')) as T;
    }

    return value as T;
  }
}