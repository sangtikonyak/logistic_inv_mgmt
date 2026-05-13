import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../common/exceptions/app-error';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import { UnitOfWork } from '../../../database/unit-of-work';
import { ActivityService } from '../../activity/services/activity.service';
import { InventoryRepository } from '../../inventory/repositories/inventory.repository';
import { InventoryStockRow } from '../../inventory/types/inventory.types';
import { WarehouseRepository } from '../../warehouse/repositories/warehouse.repository';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import {
  ProductCustomFieldRepository,
  ProductFieldValueWrite,
} from '../repositories/product-custom-field.repository';
import { ProductRepository } from '../repositories/product.repository';
import { ProductStructureRepository } from '../repositories/product-structure.repository';
import { ProductUnitRepository } from '../repositories/product-unit.repository';
import {
  JsonValue,
  ProductBundleComponentInput,
  ProductCustomFieldDefinition,
  ProductCustomFieldValueInput,
  ProductListFilters,
  ProductListPagination,
  ProductListRow,
  ProductStatus,
  ProductType,
  ProductUpsertInput,
  ProductVariant,
  ProductVariantInput,
  ProductOpeningStockInput,
  ResolvedProductCustomFieldDefinition,
} from '../types/product.types';
interface NormalizedProductInput {
  name: string;
  description: string | null;
  productType: ProductType;
  unitId: string | null;
  status: ProductStatus;
  sku: string | null | undefined;
  barcode: string | null | undefined;
  isSellable: boolean;
  isPurchasable: boolean;
  trackInventory: boolean;
  allowReturns: boolean;
  allowBackorder: boolean;
  minStockLevel: number | null;
  maxStockLevel: number | null;
  costPrice: number | null;
  sellingPrice: number | null;
  currencyCode: string | null;
  categoryIds: string[];
  bundleComponents?: ProductBundleComponentInput[];
  customFieldValues?: ProductCustomFieldValueInput[];
  variants?: NormalizedVariantInput[];
  openingStock?: ProductOpeningStockInput;
}

interface VariantWritePlan {
  id: string;
  unitId: string | null;
  name: string;
  sku: string;
  barcode: string | null;
  costPrice: number | null;
  sellingPrice: number | null;
  currencyCode: string | null;
  attributesJson: string;
  attributeSignature: string;
  sortOrder: number;
  customFieldValues?: ProductCustomFieldValueInput[];
  existingId?: string;
}

interface NormalizedVariantInput
  extends Omit<ProductVariantInput, 'name' | 'sku' | 'barcode' | 'attributes'> {
  name: string;
  sku: string | null | undefined;
  barcode: string | null | undefined;
  costPrice: number | null | undefined;
  sellingPrice: number | null | undefined;
  currencyCode: string | null | undefined;
  attributes: Array<{ name: string; value: string }>;
}

type ExistingProduct = NonNullable<Awaited<ReturnType<ProductRepository['findById']>>>;

export class ProductService {
  private readonly productRepository: ProductRepository;
  private readonly categoryRepository: ProductCategoryRepository;
  private readonly unitRepository: ProductUnitRepository;
  private readonly fieldRepository: ProductCustomFieldRepository;
  private readonly structureRepository: ProductStructureRepository;
  private readonly warehouseRepository: WarehouseRepository;
  private readonly inventoryRepository: InventoryRepository;

  constructor(
    db: Queryable,
    private readonly unitOfWork: UnitOfWork,
    private readonly activityService: ActivityService
  ) {
    this.productRepository = new ProductRepository(db);
    this.categoryRepository = new ProductCategoryRepository(db);
    this.unitRepository = new ProductUnitRepository(db);
    this.fieldRepository = new ProductCustomFieldRepository(db);
    this.structureRepository = new ProductStructureRepository(db);
    this.warehouseRepository = new WarehouseRepository(db);
    this.inventoryRepository = new InventoryRepository(db);
  }

  async createProduct(tenantId: string, actorUserId: string, input: ProductUpsertInput) {
    const normalized = this.normalizeCreateInput(input);
    const productId = uuidv4();

    this.validateProductTypeRules(normalized);
    await this.assertUnitsExist(tenantId, normalized.unitId, normalized.variants);
    await this.assertCategoriesExist(tenantId, normalized.categoryIds);
    await this.assertBundleComponentsValid(tenantId, productId, normalized.bundleComponents);

    const slug = await this.generateUniqueSlug(tenantId, normalized.name);
    const usedSkus = new Set<string>();
    const usedBarcodes = new Set<string>();
    const productSku = await this.resolveSku(tenantId, normalized.sku, normalized.name, usedSkus);
    const productBarcode = await this.resolveBarcode(tenantId, normalized.barcode, usedBarcodes);
    const variantPlans = await this.prepareVariantPlans(
      tenantId,
      productId,
      normalized.name,
      normalized.variants ?? [],
      usedSkus,
      usedBarcodes
    );
    const fieldPlans = await this.prepareFieldPlans(
      tenantId,
      productId,
      normalized.customFieldValues,
      variantPlans,
      true
    );

    try {
      await this.unitOfWork.execute(async (transaction) => {
        await this.productRepository.create(
        {
          id: productId,
          tenant_id: tenantId,
          unit_id: normalized.unitId,
          name: normalized.name,
          slug,
          description: normalized.description,
          product_type: normalized.productType,
          status: normalized.status,
          sku: productSku,
          barcode: productBarcode,
          is_sellable: normalized.isSellable ? 1 : 0,
          is_purchasable: normalized.isPurchasable ? 1 : 0,
          track_inventory: normalized.trackInventory ? 1 : 0,
          allow_returns: normalized.allowReturns ? 1 : 0,
          allow_backorder: normalized.allowBackorder ? 1 : 0,
          min_stock_level: this.toDecimalString(normalized.minStockLevel),
          max_stock_level: this.toDecimalString(normalized.maxStockLevel),
          cost_price: this.toDecimalString(normalized.costPrice),
          selling_price: this.toDecimalString(normalized.sellingPrice),
          currency_code: normalized.currencyCode,
          created_by: actorUserId,
          updated_by: actorUserId,
          deleted_by: null,
          },
        transaction
      );

      await this.categoryRepository.replaceAssignments(
        tenantId,
        productId,
        normalized.categoryIds,
        transaction
      );

      for (const variant of variantPlans) {
        await this.productRepository.createVariant(
          {
            id: variant.id,
            tenant_id: tenantId,
            product_id: productId,
              unit_id: variant.unitId,
              name: variant.name,
              sku: variant.sku,
              barcode: variant.barcode,
              cost_price: this.toDecimalString(variant.costPrice),
              selling_price: this.toDecimalString(variant.sellingPrice),
              currency_code: variant.currencyCode,
              attributes_json: variant.attributesJson,
              attribute_signature: variant.attributeSignature,
              sort_order: variant.sortOrder,
          },
          transaction
        );
      }

      await this.fieldRepository.replaceProductValues(
        tenantId,
        productId,
        fieldPlans.productValues ?? [],
        transaction
      );

      for (const variant of variantPlans) {
        await this.fieldRepository.replaceVariantValues(
          tenantId,
          variant.id,
          fieldPlans.variantValues?.get(variant.id) ?? [],
          transaction
        );
      }

      await this.structureRepository.replaceVariantAttributes(
        tenantId,
        productId,
        variantPlans.map((variant) => ({
          variantId: variant.id,
          attributes: JSON.parse(variant.attributesJson) as Array<{ name: string; value: string }>,
        })),
        transaction
      );

      await this.structureRepository.replaceBundleComponents(
        tenantId,
        productId,
        (normalized.bundleComponents ?? []).map((component) => ({
          id: component.id ?? uuidv4(),
          tenant_id: tenantId,
          bundle_product_id: productId,
          component_product_id: component.componentProductId,
          component_variant_id: component.componentVariantId ?? null,
          quantity: this.toDecimalString(component.quantity) ?? '0',
        })),
        transaction
      );

        if (normalized.openingStock) {
          await this.createOpeningInventory(
            tenantId,
            actorUserId,
            productId,
            normalized,
            normalized.openingStock,
            transaction
          );
        }
      });

      await this.activityService.logActivity({
        tenantId,
        userId: actorUserId,
        actionType: 'CREATE',
        module: 'PRODUCT',
        description: `Created product: ${normalized.name}`,
        metadata: { productId, name: normalized.name, sku: productSku },
      });
    } catch (error) {
      console.error(`Error creating product in tenant ${tenantId}:`, error);
      throw error;
    }

    return this.getProductById(tenantId, productId);
  }

  async updateProduct(tenantId: string, actorUserId: string, productId: string, input: Partial<ProductUpsertInput>) {
    const existingProduct = await this.productRepository.findById(tenantId, productId);
    if (!existingProduct) {
      throw new AppError('Product not found', 404);
    }

    const existingVariants = await this.productRepository.listVariantsByProductId(tenantId, productId);
    const existingVariantMap = new Map(existingVariants.map((variant) => [variant.id, variant]));
    const normalized = this.normalizeUpdateInput(existingProduct, input);

    this.validateProductTypeRules(normalized);
    await this.assertUnitsExist(tenantId, normalized.unitId, normalized.variants);
    await this.assertCategoriesExist(tenantId, normalized.categoryIds);
    await this.assertBundleComponentsValid(tenantId, productId, normalized.bundleComponents);

    const slug =
      normalized.name === existingProduct.name
        ? existingProduct.slug
        : await this.generateUniqueSlug(tenantId, normalized.name, productId);

    const usedSkus = new Set<string>();
    const usedBarcodes = new Set<string>();
    const productSku = await this.resolveSku(
      tenantId,
      normalized.sku,
      normalized.name,
      usedSkus,
      productId
    );
    const productBarcode = await this.resolveBarcode(
      tenantId,
      normalized.barcode,
      usedBarcodes,
      productId
    );

    const variantPlans =
      normalized.variants !== undefined
        ? await this.prepareVariantPlans(
            tenantId,
            productId,
            normalized.name,
            normalized.variants,
            usedSkus,
            usedBarcodes,
            existingVariantMap
          )
        : existingVariants.map((variant) => ({
            id: variant.id,
            existingId: variant.id,
            unitId: variant.unit_id,
            name: variant.name,
            sku: variant.sku ?? '',
            barcode: variant.barcode,
            costPrice: variant.cost_price === null ? null : Number(variant.cost_price),
            sellingPrice: variant.selling_price === null ? null : Number(variant.selling_price),
            currencyCode: variant.currency_code,
            attributesJson: variant.attributes_json,
            attributeSignature: variant.attribute_signature,
            sortOrder: variant.sort_order,
          }));

    const fieldPlans = await this.prepareFieldPlans(
      tenantId,
      productId,
      normalized.customFieldValues,
      normalized.variants !== undefined ? variantPlans : undefined,
      false
    );

    try {
      await this.unitOfWork.execute(async (transaction) => {
        await this.productRepository.update(
        tenantId,
        productId,
        {
          unit_id: normalized.unitId,
          name: normalized.name,
          slug,
          description: normalized.description,
          product_type: normalized.productType,
          status: normalized.status,
          sku: productSku,
          barcode: productBarcode,
          is_sellable: normalized.isSellable ? 1 : 0,
          is_purchasable: normalized.isPurchasable ? 1 : 0,
          track_inventory: normalized.trackInventory ? 1 : 0,
          allow_returns: normalized.allowReturns ? 1 : 0,
          allow_backorder: normalized.allowBackorder ? 1 : 0,
          min_stock_level: this.toDecimalString(normalized.minStockLevel),
          max_stock_level: this.toDecimalString(normalized.maxStockLevel),
          cost_price: this.toDecimalString(normalized.costPrice),
          selling_price: this.toDecimalString(normalized.sellingPrice),
          currency_code: normalized.currencyCode,
          updated_by: actorUserId,
        },
        transaction
      );

      if (normalized.categoryIdsChanged) {
        await this.categoryRepository.replaceAssignments(
          tenantId,
          productId,
          normalized.categoryIds,
          transaction
        );
      }

      if (normalized.variants !== undefined) {
        const keepVariantIds: string[] = [];

        for (const variant of variantPlans) {
          keepVariantIds.push(variant.id);

          if (variant.existingId) {
            await this.productRepository.updateVariant(
              tenantId,
              productId,
              variant.id,
              {
                unit_id: variant.unitId,
                name: variant.name,
                sku: variant.sku,
                barcode: variant.barcode,
                cost_price: this.toDecimalString(variant.costPrice),
                selling_price: this.toDecimalString(variant.sellingPrice),
                currency_code: variant.currencyCode,
                attributes_json: variant.attributesJson,
                attribute_signature: variant.attributeSignature,
                sort_order: variant.sortOrder,
              },
              transaction
            );
          } else {
            await this.productRepository.createVariant(
              {
                id: variant.id,
                tenant_id: tenantId,
                product_id: productId,
                unit_id: variant.unitId,
                name: variant.name,
                sku: variant.sku,
                barcode: variant.barcode,
                cost_price: this.toDecimalString(variant.costPrice),
                selling_price: this.toDecimalString(variant.sellingPrice),
                currency_code: variant.currencyCode,
                attributes_json: variant.attributesJson,
                attribute_signature: variant.attributeSignature,
                sort_order: variant.sortOrder,
              },
              transaction
            );
          }
        }

        await this.productRepository.softDeleteMissingVariants(
          tenantId,
          productId,
          keepVariantIds,
          transaction
        );

        await this.structureRepository.replaceVariantAttributes(
          tenantId,
          productId,
          variantPlans.map((variant) => ({
            variantId: variant.id,
            attributes: JSON.parse(variant.attributesJson) as Array<{ name: string; value: string }>,
          })),
          transaction
        );
      }

      if (fieldPlans.productValues !== undefined) {
        await this.fieldRepository.replaceProductValues(
          tenantId,
          productId,
          fieldPlans.productValues,
          transaction
        );
      }

      if (fieldPlans.variantValues !== undefined) {
        for (const [variantId, variantValues] of fieldPlans.variantValues.entries()) {
          await this.fieldRepository.replaceVariantValues(tenantId, variantId, variantValues, transaction);
        }
      }

        if (normalized.bundleComponentsChanged) {
          await this.structureRepository.replaceBundleComponents(
            tenantId,
            productId,
            (normalized.bundleComponents ?? []).map((component) => ({
              id: component.id ?? uuidv4(),
              tenant_id: tenantId,
              bundle_product_id: productId,
              component_product_id: component.componentProductId,
              component_variant_id: component.componentVariantId ?? null,
              quantity: this.toDecimalString(component.quantity) ?? '0',
            })),
            transaction
          );
        }
      });

      await this.activityService.logActivity({
        tenantId,
        userId: actorUserId,
        actionType: 'UPDATE',
        module: 'PRODUCT',
        description: `Updated product ${normalized.name}`,
        metadata: { productId, name: normalized.name, sku: productSku }
      });
    } catch (error) {
      console.error(`Error updating product ${productId} in tenant ${tenantId}:`, error);
      throw error;
    }

    return this.getProductById(tenantId, productId);
  }

  async deleteProduct(tenantId: string, actorUserId: string, productId: string) {
    const existingProduct = await this.productRepository.findById(tenantId, productId);
    if (!existingProduct) {
      throw new AppError('Product not found', 404);
    }

    await this.unitOfWork.execute(async (transaction) => {
      await this.productRepository.softDeleteProduct(tenantId, productId, actorUserId, transaction);
    });

    return { productId };
  }

  async getProductById(tenantId: string, productId: string) {
    const product = await this.productRepository.findById(tenantId, productId);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const [categories, variants, productFieldRows, variantFieldRows] = await Promise.all([
      this.categoryRepository.listByProductIds(tenantId, [productId]),
      this.productRepository.listVariantsByProductId(tenantId, productId),
      this.fieldRepository.listProductValues(tenantId, productId),
      this.fieldRepository.listVariantValuesByProduct(tenantId, productId),
    ]);
    const [variantAttributeRows, bundleComponents] = await Promise.all([
      this.structureRepository.listVariantAttributes(tenantId, productId),
      this.structureRepository.listBundleComponents(tenantId, productId),
    ]);

    const unitIds = new Set<string>();
    if (product.unit_id) {
      unitIds.add(product.unit_id);
    }
    for (const variant of variants) {
      if (variant.unit_id) {
        unitIds.add(variant.unit_id);
      }
    }

    const units = await this.unitRepository.findByIds(tenantId, Array.from(unitIds));
    const unitMap = new Map(units.map((unit) => [unit.id, unit]));
    const variantFieldGroupMap = new Map<
      string,
      Array<{ definitionId: string; fieldKey: string; value: JsonValue }>
    >();
    const variantAttributeMap = new Map<string, Array<{ name: string; value: string }>>();

    for (const row of variantFieldRows) {
      const variantId = String(row.variant_id);
      const current = variantFieldGroupMap.get(variantId) ?? [];
      current.push({
        definitionId: String(row.definition_id),
        fieldKey: String(row.field_key),
        value: this.decodeFieldValue(row),
      });
      variantFieldGroupMap.set(variantId, current);
    }

    for (const row of variantAttributeRows) {
      const variantId = String(row.variant_id);
      const current = variantAttributeMap.get(variantId) ?? [];
      current.push({
        name: String(row.attribute_name),
        value: String(row.attribute_value),
      });
      variantAttributeMap.set(variantId, current);
    }

    const mappedProductFields = productFieldRows.map((row) => ({
      definitionId: String(row.definition_id),
      fieldKey: String(row.field_key),
      value: this.decodeFieldValue(row),
    }));

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      productType: product.product_type,
      status: product.status,
      sku: product.sku,
      barcode: product.barcode,
      isSellable: product.is_sellable === 1,
      isPurchasable: product.is_purchasable === 1,
      trackInventory: product.track_inventory === 1,
      allowReturns: product.allow_returns === 1,
      allowBackorder: product.allow_backorder === 1,
      minStockLevel: product.min_stock_level === null ? null : Number(product.min_stock_level),
      maxStockLevel: product.max_stock_level === null ? null : Number(product.max_stock_level),
      costPrice: product.cost_price === null ? null : Number(product.cost_price),
      sellingPrice: product.selling_price === null ? null : Number(product.selling_price),
      currencyCode: product.currency_code,
      unit: product.unit_id
        ? {
            id: product.unit_id,
            name: unitMap.get(product.unit_id)?.name ?? null,
            code: unitMap.get(product.unit_id)?.code ?? null,
          }
        : null,
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        parentCategoryId: category.parent_category_id,
      })),
      customFieldValues: mappedProductFields,
      bundleComponents: bundleComponents.map((component) => ({
        id: component.id,
        componentProductId: component.component_product_id,
        componentVariantId: component.component_variant_id,
        quantity: Number(component.quantity),
      })),
      variants: variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        barcode: variant.barcode,
        costPrice: variant.cost_price === null ? null : Number(variant.cost_price),
        sellingPrice: variant.selling_price === null ? null : Number(variant.selling_price),
        currencyCode: variant.currency_code,
        sortOrder: variant.sort_order,
        unit: variant.unit_id
          ? {
              id: variant.unit_id,
              name: unitMap.get(variant.unit_id)?.name ?? null,
              code: unitMap.get(variant.unit_id)?.code ?? null,
            }
          : null,
        attributes:
          variantAttributeMap.get(variant.id) ??
          (JSON.parse(variant.attributes_json) as Array<{ name: string; value: string }>),
        customFieldValues: variantFieldGroupMap.get(variant.id) ?? [],
      })),
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    };
  }

  async listProducts(tenantId: string, filters: ProductListFilters) {
    const [products, total] = await Promise.all([
      this.productRepository.list(tenantId, filters),
      this.productRepository.count(tenantId, filters),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / filters.limit);
    const pagination: ProductListPagination = {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages,
      hasNextPage: filters.page < totalPages,
      hasPrevPage: filters.page > 1 && totalPages > 0,
    };

    return {
      items: products.map((product) => this.mapProductListRow(product)),
      pagination,
    };
  }

  private normalizeCreateInput(input: ProductUpsertInput): NormalizedProductInput {
    return {
      name: this.normalizeName(input.name),
      description: this.normalizeOptionalText(input.description),
      productType: input.productType ?? 'SIMPLE',
      unitId: input.unitId ?? null,
      status: input.status ?? 'ACTIVE',
      sku: this.normalizeNullableIdentifier(input.sku),
      barcode: this.normalizeNullableIdentifier(input.barcode),
      isSellable: input.isSellable ?? true,
      isPurchasable: input.isPurchasable ?? true,
      trackInventory: input.trackInventory ?? true,
      allowReturns: input.allowReturns ?? true,
      allowBackorder: input.allowBackorder ?? false,
      minStockLevel: input.minStockLevel ?? null,
      maxStockLevel: input.maxStockLevel ?? null,
      costPrice: input.costPrice ?? null,
      sellingPrice: input.sellingPrice ?? null,
      currencyCode: input.currencyCode ? input.currencyCode.toUpperCase() : null,
      categoryIds: this.unique(input.categoryIds ?? []),
      bundleComponents: input.bundleComponents,
      customFieldValues: input.customFieldValues,
      variants: input.variants?.map((variant) => this.normalizeVariantInput(variant)),
      openingStock: input.openingStock
        ? {
            warehouseId: input.openingStock.warehouseId,
            zoneId: input.openingStock.zoneId ?? null,
            binId: input.openingStock.binId ?? null,
            quantity: input.openingStock.quantity,
            notes: this.normalizeOptionalText(input.openingStock.notes),
          }
        : undefined,
    };
  }

  private normalizeUpdateInput(
    existingProduct: ExistingProduct,
    input: Partial<ProductUpsertInput>
  ): NormalizedProductInput & { categoryIdsChanged: boolean; bundleComponentsChanged: boolean } {
    return {
      name: input.name ? this.normalizeName(input.name) : existingProduct.name,
      description:
        input.description !== undefined
          ? this.normalizeOptionalText(input.description)
          : existingProduct.description,
      productType: input.productType ?? existingProduct.product_type,
      unitId: input.unitId !== undefined ? input.unitId : existingProduct.unit_id,
      status: input.status ?? existingProduct.status,
      sku:
        input.sku !== undefined
          ? this.normalizeNullableIdentifier(input.sku)
          : existingProduct.sku,
      barcode:
        input.barcode !== undefined
          ? this.normalizeNullableIdentifier(input.barcode)
          : existingProduct.barcode,
      isSellable: input.isSellable ?? existingProduct.is_sellable === 1,
      isPurchasable: input.isPurchasable ?? existingProduct.is_purchasable === 1,
      trackInventory: input.trackInventory ?? existingProduct.track_inventory === 1,
      allowReturns: input.allowReturns ?? existingProduct.allow_returns === 1,
      allowBackorder: input.allowBackorder ?? existingProduct.allow_backorder === 1,
      minStockLevel:
        input.minStockLevel !== undefined
          ? input.minStockLevel
          : existingProduct.min_stock_level === null
            ? null
            : Number(existingProduct.min_stock_level),
      maxStockLevel:
        input.maxStockLevel !== undefined
          ? input.maxStockLevel
          : existingProduct.max_stock_level === null
            ? null
            : Number(existingProduct.max_stock_level),
      costPrice:
        input.costPrice !== undefined
          ? input.costPrice
          : existingProduct.cost_price === null
            ? null
            : Number(existingProduct.cost_price),
      sellingPrice:
        input.sellingPrice !== undefined
          ? input.sellingPrice
          : existingProduct.selling_price === null
            ? null
            : Number(existingProduct.selling_price),
      currencyCode:
        input.currencyCode !== undefined
          ? input.currencyCode?.toUpperCase() ?? null
          : existingProduct.currency_code,
      categoryIds: this.unique(input.categoryIds ?? []),
      categoryIdsChanged: input.categoryIds !== undefined,
      bundleComponents: input.bundleComponents,
      bundleComponentsChanged: input.bundleComponents !== undefined,
      customFieldValues: input.customFieldValues,
      variants: input.variants?.map((variant) => this.normalizeVariantInput(variant)),
      openingStock: undefined,
    };
  }

  private normalizeVariantInput(
    variant: ProductVariantInput
  ): NormalizedVariantInput {
    return {
      id: variant.id,
      name: this.normalizeName(variant.name),
      sku: this.normalizeNullableIdentifier(variant.sku),
      barcode: this.normalizeNullableIdentifier(variant.barcode),
      costPrice: variant.costPrice ?? null,
      sellingPrice: variant.sellingPrice ?? null,
      currencyCode: variant.currencyCode ? variant.currencyCode.toUpperCase() : null,
      unitId: variant.unitId ?? null,
      sortOrder: variant.sortOrder ?? 0,
      attributes: variant.attributes.map((attribute) => ({
        name: this.normalizeName(attribute.name),
        value: this.normalizeName(attribute.value),
      })),
      customFieldValues: variant.customFieldValues,
    };
  }

  private validateProductTypeRules(input: NormalizedProductInput): void {
    if (input.productType === 'SIMPLE') {
      if ((input.variants?.length ?? 0) > 0) {
        throw new AppError('SIMPLE products cannot contain variants', 400);
      }
      if ((input.bundleComponents?.length ?? 0) > 0) {
        throw new AppError('SIMPLE products cannot contain bundle components', 400);
      }
    }

    if (input.productType === 'VARIABLE') {
      if ((input.variants?.length ?? 0) === 0) {
        throw new AppError('VARIABLE products must contain at least one variant', 400);
      }
      if ((input.bundleComponents?.length ?? 0) > 0) {
        throw new AppError('VARIABLE products cannot contain bundle components', 400);
      }
    }

    if (input.productType === 'SERVICE') {
      if ((input.variants?.length ?? 0) > 0) {
        throw new AppError('SERVICE products cannot contain variants in the current design', 400);
      }
      if ((input.bundleComponents?.length ?? 0) > 0) {
        throw new AppError('SERVICE products cannot contain bundle components', 400);
      }
      if (input.trackInventory) {
        throw new AppError('SERVICE products cannot enable inventory tracking', 400);
      }
      if (input.allowBackorder) {
        throw new AppError('SERVICE products cannot allow backorder', 400);
      }
    }

    if (input.productType === 'BUNDLE') {
      if ((input.variants?.length ?? 0) > 0) {
        throw new AppError('BUNDLE products cannot contain variants in the current design', 400);
      }
      if ((input.bundleComponents?.length ?? 0) === 0) {
        throw new AppError('BUNDLE products must define at least one bundle component', 400);
      }
    }

    if (input.openingStock) {
      if (input.productType === 'SERVICE') {
        throw new AppError('Opening inventory is not available for SERVICE products', 400);
      }
      if (!input.trackInventory) {
        throw new AppError('Opening inventory requires inventory tracking to be enabled', 400);
      }
    }
  }

  private async createOpeningInventory(
    tenantId: string,
    actorUserId: string,
    productId: string,
    product: NormalizedProductInput,
    openingStock: ProductOpeningStockInput,
    transaction: DatabaseTransaction
  ): Promise<void> {
    const warehouse = await this.warehouseRepository.findWarehouseById(
      tenantId,
      openingStock.warehouseId,
      transaction
    );
    if (!warehouse) {
      throw new AppError('Warehouse not found for opening inventory.', 404);
    }

    let zone = null;
    if (openingStock.zoneId) {
      zone = await this.warehouseRepository.findZoneById(tenantId, openingStock.zoneId, transaction);
      if (!zone) {
        throw new AppError('Zone not found for opening inventory.', 404);
      }
      if (zone.warehouse_id !== openingStock.warehouseId) {
        throw new AppError('Zone does not belong to the selected warehouse.', 400);
      }
    }

    let bin = null;
    if (openingStock.binId) {
      bin = await this.warehouseRepository.findBinById(tenantId, openingStock.binId, transaction);
      if (!bin) {
        throw new AppError('Bin not found for opening inventory.', 404);
      }
      if (bin.warehouse_id !== openingStock.warehouseId) {
        throw new AppError('Bin does not belong to the selected warehouse.', 400);
      }
      if (zone && bin.zone_id !== zone.id) {
        throw new AppError('Bin does not belong to the selected zone.', 400);
      }
      if (!zone) {
        zone = await this.warehouseRepository.findZoneById(tenantId, bin.zone_id, transaction);
      }
    }

    let stock = await this.inventoryRepository.findStockByLocatorForUpdate(
      {
        tenantId,
        warehouseId: openingStock.warehouseId,
        binId: openingStock.binId ?? null,
        productId,
        productVariantId: null,
      },
      transaction
    );

    if (!stock) {
      stock = {
        id: uuidv4(),
        tenant_id: tenantId,
        warehouse_id: openingStock.warehouseId,
        zone_id: zone?.id ?? null,
        bin_id: openingStock.binId ?? null,
        product_id: productId,
        product_variant_id: null,
        on_hand_quantity: this.toQuantityString(0),
        reserved_quantity: this.toQuantityString(0),
        available_quantity: this.toQuantityString(0),
        created_at: new Date(),
        updated_at: new Date(),
      } satisfies InventoryStockRow;

      await this.inventoryRepository.createStock(stock, transaction);
    }

    const nextOnHand = Number(stock.on_hand_quantity) + openingStock.quantity;
    const nextReserved = Number(stock.reserved_quantity);
    const nextAvailable = nextOnHand - nextReserved;

    await this.inventoryRepository.updateStockQuantities(
      stock.id,
      {
        onHand: this.toQuantityString(nextOnHand),
        reserved: this.toQuantityString(nextReserved),
        available: this.toQuantityString(nextAvailable),
      },
      transaction
    );

    await this.inventoryRepository.createMovement(
      {
        id: uuidv4(),
        tenant_id: tenantId,
        warehouse_id: openingStock.warehouseId,
        zone_id: zone?.id ?? stock.zone_id,
        bin_id: openingStock.binId ?? null,
        product_id: productId,
        product_variant_id: null,
        movement_type: 'OPENING',
        reference_type: 'PRODUCT_CREATION',
        reference_id: productId,
        quantity: this.toQuantityString(openingStock.quantity),
        notes: openingStock.notes ?? `Opening inventory created with product ${product.name}`,
        created_by: actorUserId,
      },
      transaction
    );
  }

  private async assertBundleComponentsValid(
    tenantId: string,
    bundleProductId: string,
    components?: ProductBundleComponentInput[]
  ): Promise<void> {
    if (!components || components.length === 0) {
      return;
    }

    const seenComponentKeys = new Set<string>();
    for (const component of components) {
      if (component.componentProductId === bundleProductId) {
        throw new AppError('A bundle cannot contain itself as a component', 400);
      }

      const key = `${component.componentProductId}:${component.componentVariantId ?? 'PRODUCT'}`;
      if (seenComponentKeys.has(key)) {
        throw new AppError('Duplicate bundle components are not allowed', 409);
      }
      seenComponentKeys.add(key);

      const product = await this.productRepository.findById(tenantId, component.componentProductId);
      if (!product) {
        throw new AppError('One or more bundle component products do not exist in the tenant context', 400);
      }

      if (component.componentVariantId) {
        const variant = await this.productRepository.findVariantByIdOnly(
          tenantId,
          component.componentVariantId
        );
        if (!variant || variant.product_id !== component.componentProductId) {
          throw new AppError(
            'Bundle component variant does not belong to the specified component product',
            400
          );
        }
      }
    }
  }

  private async assertUnitsExist(
    tenantId: string,
    productUnitId: string | null,
    variants?: NormalizedProductInput['variants']
  ): Promise<void> {
    const unitIds = new Set<string>();
    if (productUnitId) {
      unitIds.add(productUnitId);
    }
    for (const variant of variants ?? []) {
      if (variant.unitId) {
        unitIds.add(variant.unitId);
      }
    }

    if (unitIds.size === 0) {
      return;
    }

    const units = await this.unitRepository.findByIds(tenantId, Array.from(unitIds));
    if (units.length !== unitIds.size) {
      throw new AppError('One or more referenced units do not exist in the tenant context', 400);
    }
  }

  private async assertCategoriesExist(tenantId: string, categoryIds: string[]): Promise<void> {
    if (categoryIds.length === 0) {
      return;
    }

    const categories = await this.categoryRepository.findByIds(tenantId, categoryIds);
    if (categories.length !== categoryIds.length) {
      throw new AppError('One or more referenced categories do not exist in the tenant context', 400);
    }
  }

  private async generateUniqueSlug(
    tenantId: string,
    name: string,
    excludeProductId?: string
  ): Promise<string> {
    const baseSlug = this.slugify(name);
    let candidate = baseSlug;
    let counter = 2;

    while (await this.productRepository.findBySlug(tenantId, candidate, excludeProductId)) {
      candidate = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return candidate;
  }

  private async resolveSku(
    tenantId: string,
    requestedSku: string | null | undefined,
    skuSeed: string,
    localUsedSkus: Set<string>,
    excludeProductId?: string,
    excludeVariantId?: string
  ): Promise<string> {
    if (requestedSku) {
      const normalized = this.normalizeSku(requestedSku);
      if (localUsedSkus.has(normalized)) {
        throw new AppError(`SKU ${normalized} is duplicated within the request payload`, 409);
      }

      if (await this.productRepository.existsSkuConflict(tenantId, normalized, excludeProductId, excludeVariantId)) {
        throw new AppError(`SKU ${normalized} already exists for this tenant`, 409);
      }

      localUsedSkus.add(normalized);
      return normalized;
    }

    const baseSku = this.normalizeSku(skuSeed);
    let candidate = baseSku;
    let counter = 2;

    while (
      localUsedSkus.has(candidate) ||
      (await this.productRepository.existsSkuConflict(tenantId, candidate, excludeProductId, excludeVariantId))
    ) {
      candidate = `${baseSku}-${counter}`;
      counter += 1;
    }

    localUsedSkus.add(candidate);
    return candidate;
  }

  private async resolveBarcode(
    tenantId: string,
    requestedBarcode: string | null | undefined,
    localUsedBarcodes: Set<string>,
    excludeProductId?: string,
    excludeVariantId?: string
  ): Promise<string | null> {
    if (!requestedBarcode) {
      return null;
    }

    const normalized = requestedBarcode.trim().slice(0, 100);
    if (localUsedBarcodes.has(normalized)) {
      throw new AppError(`Barcode ${normalized} is duplicated within the request payload`, 409);
    }

    if (
      await this.productRepository.existsBarcodeConflict(
        tenantId,
        normalized,
        excludeProductId,
        excludeVariantId
      )
    ) {
      throw new AppError(`Barcode ${normalized} already exists for this tenant`, 409);
    }

    localUsedBarcodes.add(normalized);
    return normalized;
  }

  private async prepareVariantPlans(
    tenantId: string,
    productId: string,
    productName: string,
    variants: NormalizedProductInput['variants'],
    localUsedSkus: Set<string>,
    localUsedBarcodes: Set<string>,
    existingVariantMap?: Map<string, ProductVariant>
  ): Promise<VariantWritePlan[]> {
    const plans: VariantWritePlan[] = [];
    const signatureSet = new Set<string>();

    for (const variant of variants ?? []) {
      const existingVariant = variant.id ? existingVariantMap?.get(variant.id) : undefined;
      if (variant.id && !existingVariant) {
        throw new AppError(`Variant ${variant.id} was not found for this product`, 404);
      }

      const attributeSignature = this.buildAttributeSignature(variant.attributes);
      if (signatureSet.has(attributeSignature)) {
        throw new AppError('Each variant must have a unique attribute combination within the product', 409);
      }
      signatureSet.add(attributeSignature);

      const variantId = existingVariant?.id ?? uuidv4();
      const variantSku = await this.resolveSku(
        tenantId,
        variant.sku,
        `${productName}-${variant.name}`,
        localUsedSkus,
        undefined,
        existingVariant?.id
      );
      const variantBarcode = await this.resolveBarcode(
        tenantId,
        variant.barcode,
        localUsedBarcodes,
        undefined,
        existingVariant?.id
      );

      plans.push({
        id: variantId,
        existingId: existingVariant?.id,
        unitId: variant.unitId ?? null,
        name: variant.name,
        sku: variantSku,
        barcode: variantBarcode,
        costPrice: variant.costPrice ?? null,
        sellingPrice: variant.sellingPrice ?? null,
        currencyCode: variant.currencyCode ?? null,
        attributesJson: JSON.stringify(variant.attributes),
        attributeSignature,
        sortOrder: variant.sortOrder ?? 0,
        customFieldValues: variant.customFieldValues,
      });
    }

    return plans;
  }

  private async prepareFieldPlans(
    tenantId: string,
    productId: string,
    productFieldValues: ProductCustomFieldValueInput[] | undefined,
    variantPlans: VariantWritePlan[] | undefined,
    requireProductFields: boolean
  ): Promise<{
    productValues?: ProductFieldValueWrite[];
    variantValues?: Map<string, ProductFieldValueWrite[]>;
  }> {
    const allInputDefinitionIds = new Set<string>();
    for (const value of productFieldValues ?? []) {
      allInputDefinitionIds.add(value.definitionId);
    }
    for (const variant of variantPlans ?? []) {
      for (const value of variant.customFieldValues ?? []) {
        allInputDefinitionIds.add(value.definitionId);
      }
    }

    const definitions = await this.fieldRepository.findDefinitionsByIds(
      tenantId,
      Array.from(allInputDefinitionIds)
    );
    const definitionMap = new Map(
      definitions.map((definition) => [definition.id, this.resolveDefinition(definition)])
    );

    if (definitions.length !== allInputDefinitionIds.size) {
      throw new AppError('One or more referenced custom field definitions do not exist in the tenant context', 400);
    }

    if (requireProductFields || productFieldValues !== undefined) {
      const requiredProductDefinitions = await this.loadRequiredDefinitions(tenantId, ['PRODUCT', 'BOTH']);
      this.assertRequiredFieldCoverage(requiredProductDefinitions, productFieldValues ?? [], 'product');
    }

    const productValues =
      productFieldValues !== undefined || requireProductFields
        ? this.buildFieldWrites(
            tenantId,
            productId,
            null,
            productFieldValues ?? [],
            definitionMap,
            ['PRODUCT', 'BOTH']
          )
        : undefined;

    let variantValues: Map<string, ProductFieldValueWrite[]> | undefined;
    if (variantPlans !== undefined) {
      variantValues = new Map<string, ProductFieldValueWrite[]>();
      const requiredVariantDefinitions = await this.loadRequiredDefinitions(tenantId, ['VARIANT', 'BOTH']);

      for (const variant of variantPlans) {
        const shouldReplaceValues = !variant.existingId || variant.customFieldValues !== undefined;
        if (!shouldReplaceValues) {
          continue;
        }

        this.assertRequiredFieldCoverage(requiredVariantDefinitions, variant.customFieldValues ?? [], 'variant');
        variantValues.set(
          variant.id,
          this.buildFieldWrites(
            tenantId,
            productId,
            variant.id,
            variant.customFieldValues ?? [],
            definitionMap,
            ['VARIANT', 'BOTH']
          )
        );
      }
    }

    return { productValues, variantValues };
  }

  private async loadRequiredDefinitions(
    tenantId: string,
    appliesTo: Array<ProductCustomFieldDefinition['applies_to']>
  ): Promise<ResolvedProductCustomFieldDefinition[]> {
    const definitions = await this.fieldRepository.listRequiredDefinitions(tenantId, appliesTo);
    return definitions.map((definition) => this.resolveDefinition(definition));
  }

  private resolveDefinition(
    definition: ProductCustomFieldDefinition
  ): ResolvedProductCustomFieldDefinition {
    return {
      id: definition.id,
      name: definition.name,
      fieldKey: definition.field_key,
      fieldType: definition.field_type,
      appliesTo: definition.applies_to,
      isRequired: definition.is_required === 1,
      allowedValues: definition.allowed_values_json
        ? (JSON.parse(definition.allowed_values_json) as string[])
        : null,
      validationRules: definition.validation_rules_json
        ? JSON.parse(definition.validation_rules_json)
        : null,
      sortOrder: definition.sort_order,
    };
  }

  private assertRequiredFieldCoverage(
    requiredDefinitions: ResolvedProductCustomFieldDefinition[],
    providedValues: ProductCustomFieldValueInput[],
    contextLabel: 'product' | 'variant'
  ): void {
    const providedDefinitionIds = new Set(providedValues.map((value) => value.definitionId));
    const missingRequiredField = requiredDefinitions.find(
      (definition) => !providedDefinitionIds.has(definition.id)
    );

    if (missingRequiredField) {
      throw new AppError(
        `Missing required ${contextLabel} custom field ${missingRequiredField.fieldKey}`,
        400
      );
    }
  }

  private buildFieldWrites(
    tenantId: string,
    productId: string,
    variantId: string | null,
    values: ProductCustomFieldValueInput[],
    definitionMap: Map<string, ResolvedProductCustomFieldDefinition>,
    allowedScopes: Array<ResolvedProductCustomFieldDefinition['appliesTo']>
  ): ProductFieldValueWrite[] {
    const seenDefinitionIds = new Set<string>();

    return values.map((value) => {
      if (seenDefinitionIds.has(value.definitionId)) {
        throw new AppError('Duplicate custom field values were provided for the same definition', 400);
      }
      seenDefinitionIds.add(value.definitionId);

      const definition = definitionMap.get(value.definitionId);
      if (!definition) {
        throw new AppError('Custom field definition was not found for the tenant', 400);
      }

      if (!allowedScopes.includes(definition.appliesTo)) {
        throw new AppError(
          `Custom field ${definition.fieldKey} cannot be applied to this entity type`,
          400
        );
      }

      return this.toFieldWrite(tenantId, productId, variantId, value.value as JsonValue, definition);
    });
  }

  private toFieldWrite(
    tenantId: string,
    productId: string,
    variantId: string | null,
    value: JsonValue,
    definition: ResolvedProductCustomFieldDefinition
  ): ProductFieldValueWrite {
    const write: ProductFieldValueWrite = {
      id: uuidv4(),
      tenantId,
      definitionId: definition.id,
      productId,
      variantId,
      valueText: null,
      valueNumber: null,
      valueBoolean: null,
      valueDate: null,
      valueJson: null,
    };

    switch (definition.fieldType) {
      case 'TEXT': {
        if (typeof value !== 'string') {
          throw new AppError(`Custom field ${definition.fieldKey} expects a text value`, 400);
        }
        this.validateTextValue(definition, value);
        write.valueText = value;
        return write;
      }
      case 'NUMBER': {
        if (typeof value !== 'number' || Number.isNaN(value)) {
          throw new AppError(`Custom field ${definition.fieldKey} expects a numeric value`, 400);
        }
        this.validateNumberValue(definition, value);
        write.valueNumber = value;
        return write;
      }
      case 'BOOLEAN': {
        if (typeof value !== 'boolean') {
          throw new AppError(`Custom field ${definition.fieldKey} expects a boolean value`, 400);
        }
        write.valueBoolean = value;
        return write;
      }
      case 'DATE': {
        if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
          throw new AppError(`Custom field ${definition.fieldKey} expects an ISO-compatible date string`, 400);
        }
        write.valueDate = value.slice(0, 10);
        return write;
      }
      case 'SELECT': {
        if (typeof value !== 'string') {
          throw new AppError(`Custom field ${definition.fieldKey} expects a single select value`, 400);
        }
        this.validateAllowedValues(definition, [value]);
        write.valueText = value;
        return write;
      }
      case 'MULTI_SELECT': {
        if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
          throw new AppError(`Custom field ${definition.fieldKey} expects an array of select values`, 400);
        }
        this.validateAllowedValues(definition, value as string[]);
        write.valueJson = JSON.stringify(value);
        return write;
      }
      default:
        throw new AppError(`Unsupported custom field type for ${definition.fieldKey}`, 400);
    }
  }

  private validateTextValue(
    definition: ResolvedProductCustomFieldDefinition,
    value: string
  ): void {
    const rules = definition.validationRules;
    if (rules?.minLength !== undefined && value.length < rules.minLength) {
      throw new AppError(`Custom field ${definition.fieldKey} is shorter than allowed`, 400);
    }
    if (rules?.maxLength !== undefined && value.length > rules.maxLength) {
      throw new AppError(`Custom field ${definition.fieldKey} is longer than allowed`, 400);
    }
    if (rules?.pattern && !new RegExp(rules.pattern).test(value)) {
      throw new AppError(`Custom field ${definition.fieldKey} does not match the required pattern`, 400);
    }
  }

  private validateNumberValue(
    definition: ResolvedProductCustomFieldDefinition,
    value: number
  ): void {
    const rules = definition.validationRules;
    if (rules?.min !== undefined && value < rules.min) {
      throw new AppError(`Custom field ${definition.fieldKey} is lower than allowed`, 400);
    }
    if (rules?.max !== undefined && value > rules.max) {
      throw new AppError(`Custom field ${definition.fieldKey} is higher than allowed`, 400);
    }
  }

  private validateAllowedValues(
    definition: ResolvedProductCustomFieldDefinition,
    values: string[]
  ): void {
    const allowedValues = definition.allowedValues ?? [];
    const invalidValue = values.find((item) => !allowedValues.includes(item));
    if (invalidValue) {
      throw new AppError(
        `Custom field ${definition.fieldKey} contains unsupported value ${invalidValue}`,
        400
      );
    }
  }

  private decodeFieldValue(row: Record<string, unknown>): JsonValue {
    if (row.value_text !== null && row.value_text !== undefined) {
      return String(row.value_text);
    }
    if (row.value_number !== null && row.value_number !== undefined) {
      return Number(row.value_number);
    }
    if (row.value_boolean !== null && row.value_boolean !== undefined) {
      return Number(row.value_boolean) === 1;
    }
    if (row.value_date !== null && row.value_date !== undefined) {
      return String(row.value_date);
    }
    if (row.value_json !== null && row.value_json !== undefined) {
      return JSON.parse(String(row.value_json)) as JsonValue;
    }
    return null;
  }

  private mapProductListRow(product: ProductListRow) {
    const categoryIds = product.category_ids ? product.category_ids.split(',') : [];
    const categoryNames = product.category_names ? product.category_names.split(',') : [];

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      productType: product.product_type,
      status: product.status,
      sku: product.sku,
      barcode: product.barcode,
      isSellable: product.is_sellable === 1,
      isPurchasable: product.is_purchasable === 1,
      trackInventory: product.track_inventory === 1,
      allowReturns: product.allow_returns === 1,
      allowBackorder: product.allow_backorder === 1,
      unit: product.unit_id
        ? {
            id: product.unit_id,
            name: product.unit_name,
            code: product.unit_code,
          }
        : null,
      categories: categoryIds.map((categoryId, index) => ({
        id: categoryId,
        name: categoryNames[index] ?? null,
      })),
      variantCount: Number(product.variant_count),
      costPrice: product.cost_price === null ? null : Number(product.cost_price),
      sellingPrice: product.selling_price === null ? null : Number(product.selling_price),
      currencyCode: product.currency_code,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    };
  }

  private toDecimalString(value: number | null | undefined): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    return value.toFixed(4);
  }

  private toQuantityString(value: number): string {
    return value.toFixed(4);
  }

  private normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private normalizeOptionalText(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeNullableIdentifier(value?: string | null): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeSku(value: string): string {
    const normalized = value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    return (normalized.length > 0 ? normalized : 'SKU').slice(0, 100);
  }

  private slugify(value: string): string {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    return (slug.length > 0 ? slug : 'product').slice(0, 190);
  }

  private buildAttributeSignature(attributes: Array<{ name: string; value: string }>): string {
    return attributes
      .map((attribute) => `${attribute.name.toLowerCase()}=${attribute.value.toLowerCase()}`)
      .sort()
      .join('|')
      .slice(0, 255);
  }

  private unique(values: string[]): string[] {
    return Array.from(new Set(values));
  }
}
