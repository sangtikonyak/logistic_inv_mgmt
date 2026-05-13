import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../common/exceptions/app-error';
import { Queryable } from '../../../database/database.types';
import { ProductRepository } from '../repositories/product.repository';
import { ProductStructureRepository } from '../repositories/product-structure.repository';

export class ProductAttributeService {
  private readonly productRepository: ProductRepository;
  private readonly structureRepository: ProductStructureRepository;

  constructor(db: Queryable) {
    this.productRepository = new ProductRepository(db);
    this.structureRepository = new ProductStructureRepository(db);
  }

  async listAttributes(tenantId: string, productId: string) {
    await this.assertVariableProductExists(tenantId, productId);

    const [attributes, attributeRows] = await Promise.all([
      this.structureRepository.listAttributesByProductId(tenantId, productId),
      this.structureRepository.listVariantAttributes(tenantId, productId),
    ]);

    const valuesByAttribute = new Map<string, Array<{ id: string; value: string; sortOrder: number }>>();
    for (const attribute of attributes) {
      const values = await this.structureRepository.listAttributeValuesByAttributeId(tenantId, attribute.id);
      valuesByAttribute.set(
        attribute.id,
        values.map((value) => ({
          id: value.id,
          value: value.value,
          sortOrder: value.sort_order,
        }))
      );
    }

    const usageByAttribute = new Map<string, number>();
    for (const row of attributeRows) {
      const attributeName = String(row.attribute_name);
      const attribute = attributes.find((item) => item.name === attributeName);
      if (!attribute) {
        continue;
      }
      usageByAttribute.set(attribute.id, (usageByAttribute.get(attribute.id) ?? 0) + 1);
    }

    return attributes.map((attribute) => ({
      id: attribute.id,
      name: attribute.name,
      slug: attribute.slug,
      sortOrder: attribute.sort_order,
      variantUsageCount: usageByAttribute.get(attribute.id) ?? 0,
      values: valuesByAttribute.get(attribute.id) ?? [],
    }));
  }

  async createAttribute(
    tenantId: string,
    productId: string,
    input: {
      name: string;
      sortOrder: number;
      values: Array<{ value: string; sortOrder: number }>;
    }
  ) {
    await this.assertVariableProductExists(tenantId, productId);

    const name = this.normalizeName(input.name);
    const slug = await this.generateUniqueSlug(tenantId, productId, name);
    const normalizedValues = this.normalizeDistinctValues(input.values);

    const attributeId = uuidv4();
    await this.structureRepository.createAttribute({
      id: attributeId,
      tenant_id: tenantId,
      product_id: productId,
      name,
      slug,
      sort_order: input.sortOrder,
    });

    for (const value of normalizedValues) {
      await this.structureRepository.createAttributeValue({
        id: uuidv4(),
        tenant_id: tenantId,
        attribute_id: attributeId,
        value: value.value,
        sort_order: value.sortOrder,
      });
    }

    return this.listAttributes(tenantId, productId);
  }

  async updateAttribute(
    tenantId: string,
    productId: string,
    attributeId: string,
    input: { name?: string; sortOrder?: number }
  ) {
    await this.assertVariableProductExists(tenantId, productId);

    const existingAttribute = await this.structureRepository.findAttributeById(
      tenantId,
      productId,
      attributeId
    );
    if (!existingAttribute) {
      throw new AppError('Product attribute not found', 404);
    }

    const name = input.name ? this.normalizeName(input.name) : existingAttribute.name;
    const slug =
      name === existingAttribute.name
        ? existingAttribute.slug
        : await this.generateUniqueSlug(tenantId, productId, name, attributeId);
    const sortOrder = input.sortOrder ?? existingAttribute.sort_order;

    if (name !== existingAttribute.name) {
      const inUse = await this.structureRepository.isAttributeUsedByVariants(
        tenantId,
        productId,
        attributeId
      );
      if (inUse) {
        throw new AppError(
          'Attribute name cannot be changed while active variants depend on it',
          409
        );
      }
    }

    await this.structureRepository.updateAttribute(tenantId, productId, attributeId, {
      name,
      slug,
      sort_order: sortOrder,
    });

    return this.listAttributes(tenantId, productId);
  }

  async deleteAttribute(tenantId: string, productId: string, attributeId: string) {
    await this.assertVariableProductExists(tenantId, productId);

    const existingAttribute = await this.structureRepository.findAttributeById(
      tenantId,
      productId,
      attributeId
    );
    if (!existingAttribute) {
      throw new AppError('Product attribute not found', 404);
    }

    if (await this.structureRepository.isAttributeUsedByVariants(tenantId, productId, attributeId)) {
      throw new AppError(
        'Attribute cannot be deleted while active variants depend on it',
        409
      );
    }

    await this.structureRepository.deleteAttribute(tenantId, productId, attributeId);
    return { attributeId };
  }

  async createAttributeValue(
    tenantId: string,
    productId: string,
    attributeId: string,
    input: { value: string; sortOrder: number }
  ) {
    await this.assertVariableProductExists(tenantId, productId);
    const attribute = await this.requireAttribute(tenantId, productId, attributeId);

    const value = this.normalizeName(input.value);
    if (await this.structureRepository.existsAttributeValue(tenantId, attribute.id, value)) {
      throw new AppError('Attribute value already exists for this attribute', 409);
    }

    await this.structureRepository.createAttributeValue({
      id: uuidv4(),
      tenant_id: tenantId,
      attribute_id: attribute.id,
      value,
      sort_order: input.sortOrder,
    });

    return this.listAttributes(tenantId, productId);
  }

  async updateAttributeValue(
    tenantId: string,
    productId: string,
    attributeId: string,
    valueId: string,
    input: { value?: string; sortOrder?: number }
  ) {
    await this.assertVariableProductExists(tenantId, productId);
    const attribute = await this.requireAttribute(tenantId, productId, attributeId);
    const existingValue = await this.structureRepository.findAttributeValueById(
      tenantId,
      attribute.id,
      valueId
    );
    if (!existingValue) {
      throw new AppError('Attribute value not found', 404);
    }

    const nextValue = input.value ? this.normalizeName(input.value) : existingValue.value;
    const sortOrder = input.sortOrder ?? existingValue.sort_order;

    if (nextValue !== existingValue.value) {
      if (
        await this.structureRepository.existsAttributeValue(
          tenantId,
          attribute.id,
          nextValue,
          valueId
        )
      ) {
        throw new AppError('Attribute value already exists for this attribute', 409);
      }

      if (
        await this.structureRepository.isAttributeValueUsedByVariants(
          tenantId,
          productId,
          attribute.id,
          valueId
        )
      ) {
        throw new AppError(
          'Attribute value cannot be renamed while active variants depend on it',
          409
        );
      }
    }

    await this.structureRepository.updateAttributeValue(tenantId, attribute.id, valueId, {
      value: nextValue,
      sort_order: sortOrder,
    });

    return this.listAttributes(tenantId, productId);
  }

  async deleteAttributeValue(
    tenantId: string,
    productId: string,
    attributeId: string,
    valueId: string
  ) {
    await this.assertVariableProductExists(tenantId, productId);
    const attribute = await this.requireAttribute(tenantId, productId, attributeId);
    const existingValue = await this.structureRepository.findAttributeValueById(
      tenantId,
      attribute.id,
      valueId
    );
    if (!existingValue) {
      throw new AppError('Attribute value not found', 404);
    }

    if (
      await this.structureRepository.isAttributeValueUsedByVariants(
        tenantId,
        productId,
        attribute.id,
        valueId
      )
    ) {
      throw new AppError(
        'Attribute value cannot be deleted while active variants depend on it',
        409
      );
    }

    await this.structureRepository.deleteAttributeValue(tenantId, attribute.id, valueId);
    return { valueId };
  }

  private async assertVariableProductExists(tenantId: string, productId: string) {
    const product = await this.productRepository.findById(tenantId, productId);
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    if (product.product_type !== 'VARIABLE') {
      throw new AppError('Attribute management is only supported for VARIABLE products', 400);
    }
    return product;
  }

  private async requireAttribute(tenantId: string, productId: string, attributeId: string) {
    const attribute = await this.structureRepository.findAttributeById(tenantId, productId, attributeId);
    if (!attribute) {
      throw new AppError('Product attribute not found', 404);
    }
    return attribute;
  }

  private normalizeDistinctValues(values: Array<{ value: string; sortOrder: number }>) {
    const seen = new Set<string>();
    return values.map((value) => {
      const normalized = this.normalizeName(value.value);
      const dedupeKey = normalized.toLowerCase();
      if (seen.has(dedupeKey)) {
        throw new AppError('Duplicate attribute values are not allowed', 409);
      }
      seen.add(dedupeKey);
      return {
        value: normalized,
        sortOrder: value.sortOrder,
      };
    });
  }

  private async generateUniqueSlug(
    tenantId: string,
    productId: string,
    name: string,
    excludeAttributeId?: string
  ) {
    const baseSlug = this.slugify(name);
    let candidate = baseSlug;
    let counter = 2;

    while (
      await this.structureRepository.existsAttributeSlug(
        tenantId,
        productId,
        candidate,
        excludeAttributeId
      )
    ) {
      candidate = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return candidate;
  }

  private normalizeName(value: string) {
    return value.trim().replace(/\s+/g, ' ');
  }

  private slugify(value: string) {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    return slug.length > 0 ? slug : 'attribute';
  }
}
