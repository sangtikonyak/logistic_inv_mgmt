import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../common/exceptions/app-error';
import { Queryable } from '../../../database/database.types';
import { ProductCategoryRepository } from '../repositories/product-category.repository';

export class ProductCategoryService {
  private readonly categoryRepository: ProductCategoryRepository;

  constructor(db: Queryable) {
    this.categoryRepository = new ProductCategoryRepository(db);
  }

  async createCategory(
    tenantId: string,
    input: { name: string; parentCategoryId?: string | null; description?: string | null }
  ) {
    const name = this.normalizeName(input.name);
    const description = this.normalizeOptionalText(input.description);
    const parentCategoryId = input.parentCategoryId ?? null;
    const slug = await this.generateUniqueSlug(tenantId, name);

    if (parentCategoryId) {
      const parent = await this.categoryRepository.findById(tenantId, parentCategoryId);
      if (!parent) {
        throw new AppError('Parent category not found', 404);
      }
    }

    await this.categoryRepository.create({
      id: uuidv4(),
      tenant_id: tenantId,
      parent_category_id: parentCategoryId,
      name,
      slug,
      description,
    });

    return this.categoryRepository.list(tenantId);
  }

  async updateCategory(
    tenantId: string,
    categoryId: string,
    input: { name?: string; parentCategoryId?: string | null; description?: string | null }
  ) {
    const existingCategory = await this.categoryRepository.findById(tenantId, categoryId);
    if (!existingCategory) {
      throw new AppError('Category not found', 404);
    }

    const name = input.name ? this.normalizeName(input.name) : existingCategory.name;
    const description =
      input.description !== undefined
        ? this.normalizeOptionalText(input.description)
        : existingCategory.description;
    const parentCategoryId =
      input.parentCategoryId !== undefined ? input.parentCategoryId : existingCategory.parent_category_id;

    if (parentCategoryId === categoryId) {
      throw new AppError('A category cannot be its own parent', 400);
    }

    if (parentCategoryId) {
      const parent = await this.categoryRepository.findById(tenantId, parentCategoryId);
      if (!parent) {
        throw new AppError('Parent category not found', 404);
      }
    }

    const slug =
      name === existingCategory.name
        ? existingCategory.slug
        : await this.generateUniqueSlug(tenantId, name, categoryId);

    await this.categoryRepository.update(tenantId, categoryId, {
      name,
      slug,
      parent_category_id: parentCategoryId ?? null,
      description,
    });

    return this.categoryRepository.findById(tenantId, categoryId);
  }

  async listCategories(tenantId: string) {
    return this.categoryRepository.list(tenantId);
  }

  async deleteCategory(tenantId: string, categoryId: string) {
    const existingCategory = await this.categoryRepository.findById(tenantId, categoryId);
    if (!existingCategory) {
      throw new AppError('Category not found', 404);
    }

    if (await this.categoryRepository.hasActiveChildren(tenantId, categoryId)) {
      throw new AppError('Category cannot be deleted while it still has active child categories', 409);
    }

    if (await this.categoryRepository.isAssignedToActiveProducts(tenantId, categoryId)) {
      throw new AppError('Category cannot be deleted while active products are assigned to it', 409);
    }

    await this.categoryRepository.softDelete(tenantId, categoryId);
    return { categoryId };
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

  private async generateUniqueSlug(
    tenantId: string,
    name: string,
    excludeCategoryId?: string
  ): Promise<string> {
    const baseSlug = this.slugify(name);
    let candidate = baseSlug;
    let counter = 2;

    while (await this.categoryRepository.existsBySlug(tenantId, candidate, excludeCategoryId)) {
      candidate = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return candidate;
  }

  private slugify(value: string): string {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    return slug.length > 0 ? slug : 'category';
  }
}
