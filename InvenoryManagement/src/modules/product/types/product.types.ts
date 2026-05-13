export type ProductType = 'SIMPLE' | 'VARIABLE' | 'SERVICE' | 'BUNDLE';
export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type ProductFieldType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'SELECT' | 'MULTI_SELECT';
export type ProductFieldAppliesTo = 'PRODUCT' | 'VARIANT' | 'BOTH';

export interface ProductUnit {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  description: string | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export interface ProductCategory {
  id: string;
  tenant_id: string;
  parent_category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export interface Product {
  id: string;
  tenant_id: string;
  unit_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  product_type: ProductType;
  status: ProductStatus;
  sku: string | null;
  barcode: string | null;
  is_sellable: number;
  is_purchasable: number;
  track_inventory: number;
  allow_returns: number;
  allow_backorder: number;
  min_stock_level: string | null;
  max_stock_level: string | null;
  cost_price: string | null;
  selling_price: string | null;
  currency_code: string | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export interface ProductVariant {
  id: string;
  tenant_id: string;
  product_id: string;
  unit_id: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  cost_price: string | null;
  selling_price: string | null;
  currency_code: string | null;
  attributes_json: string;
  attribute_signature: string;
  sort_order: number;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export interface ProductCategoryAssignment {
  product_id: string;
  category_id: string;
  tenant_id: string;
  created_at?: Date;
}

export interface ProductCustomFieldDefinition {
  id: string;
  tenant_id: string;
  name: string;
  field_key: string;
  field_type: ProductFieldType;
  applies_to: ProductFieldAppliesTo;
  is_required: number;
  allowed_values_json: string | null;
  validation_rules_json: string | null;
  sort_order: number;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export interface ProductCustomFieldValue {
  id: string;
  tenant_id: string;
  definition_id: string;
  product_id: string | null;
  variant_id: string | null;
  value_text: string | null;
  value_number: string | null;
  value_boolean: number | null;
  value_date: string | null;
  value_json: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface ProductAttributeInput {
  name: string;
  value: string;
}

export interface ProductBundleComponentInput {
  id?: string;
  componentProductId: string;
  componentVariantId?: string | null;
  quantity: number;
}

export interface ProductCustomFieldValueInput {
  definitionId: string;
  value: JsonValue;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export interface ProductVariantInput {
  id?: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  costPrice?: number | null;
  sellingPrice?: number | null;
  currencyCode?: string | null;
  unitId?: string | null;
  sortOrder?: number;
  attributes: ProductAttributeInput[];
  customFieldValues?: ProductCustomFieldValueInput[];
}

export interface ProductOpeningStockInput {
  warehouseId: string;
  zoneId?: string | null;
  binId?: string | null;
  quantity: number;
  notes?: string | null;
}

export interface ProductUpsertInput {
  name: string;
  description?: string | null;
  productType?: ProductType;
  unitId?: string | null;
  status?: ProductStatus;
  sku?: string | null;
  barcode?: string | null;
  isSellable?: boolean;
  isPurchasable?: boolean;
  trackInventory?: boolean;
  allowReturns?: boolean;
  allowBackorder?: boolean;
  minStockLevel?: number | null;
  maxStockLevel?: number | null;
  costPrice?: number | null;
  sellingPrice?: number | null;
  currencyCode?: string | null;
  categoryIds?: string[];
  bundleComponents?: ProductBundleComponentInput[];
  customFieldValues?: ProductCustomFieldValueInput[];
  variants?: ProductVariantInput[];
  openingStock?: ProductOpeningStockInput;
}

export interface ProductListFilters {
  search?: string;
  categoryId?: string;
  unitId?: string;
  productType?: ProductType;
  status?: ProductStatus;
  isSellable?: boolean;
  isPurchasable?: boolean;
  page: number;
  limit: number;
  sortBy: 'created_at' | 'updated_at' | 'name';
  sortDir: 'ASC' | 'DESC';
}

export interface ProductListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ProductListRow extends Product {
  unit_name: string | null;
  unit_code: string | null;
  category_ids: string | null;
  category_names: string | null;
  variant_count: number;
}

export interface ProductAttribute {
  id: string;
  tenant_id: string;
  product_id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export interface ProductAttributeValue {
  id: string;
  tenant_id: string;
  attribute_id: string;
  value: string;
  sort_order: number;
}

export interface ProductVariantAttributeValue {
  variant_id: string;
  attribute_id: string;
  attribute_value_id: string;
  tenant_id: string;
}

export interface ProductBundleComponent {
  id: string;
  tenant_id: string;
  bundle_product_id: string;
  component_product_id: string;
  component_variant_id: string | null;
  quantity: string;
}

export interface ProductDefinitionValidationRules {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface ResolvedProductCustomFieldDefinition {
  id: string;
  name: string;
  fieldKey: string;
  fieldType: ProductFieldType;
  appliesTo: ProductFieldAppliesTo;
  isRequired: boolean;
  allowedValues: string[] | null;
  validationRules: ProductDefinitionValidationRules | null;
  sortOrder: number;
}

export interface ResolvedCustomFieldValue {
  definitionId: string;
  fieldKey: string;
  value: JsonValue;
}
