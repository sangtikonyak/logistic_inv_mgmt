import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../common/exceptions/app-error';
import { Queryable } from '../../../database/database.types';
import { ProductUnitRepository } from '../repositories/product-unit.repository';

export class ProductUnitService {
  private readonly unitRepository: ProductUnitRepository;

  constructor(db: Queryable) {
    this.unitRepository = new ProductUnitRepository(db);
  }

  async createUnit(tenantId: string, input: { name: string; code: string; description?: string | null }) {
    const name = this.normalizeName(input.name);
    const code = this.normalizeCode(input.code);
    const description = this.normalizeOptionalText(input.description);

    if (await this.unitRepository.existsByName(tenantId, name)) {
      throw new AppError('A unit with this name already exists for the tenant', 409);
    }

    if (await this.unitRepository.existsByCode(tenantId, code)) {
      throw new AppError('A unit with this code already exists for the tenant', 409);
    }

    await this.unitRepository.create({
      id: uuidv4(),
      tenant_id: tenantId,
      name,
      code,
      description,
    });

    return this.unitRepository.list(tenantId);
  }

  async updateUnit(
    tenantId: string,
    unitId: string,
    input: { name?: string; code?: string; description?: string | null }
  ) {
    const existingUnit = await this.unitRepository.findById(tenantId, unitId);
    if (!existingUnit) {
      throw new AppError('Unit not found', 404);
    }

    const name = input.name ? this.normalizeName(input.name) : existingUnit.name;
    const code = input.code ? this.normalizeCode(input.code) : existingUnit.code;
    const description =
      input.description !== undefined
        ? this.normalizeOptionalText(input.description)
        : existingUnit.description;

    if (await this.unitRepository.existsByName(tenantId, name, unitId)) {
      throw new AppError('A unit with this name already exists for the tenant', 409);
    }

    if (await this.unitRepository.existsByCode(tenantId, code, unitId)) {
      throw new AppError('A unit with this code already exists for the tenant', 409);
    }

    await this.unitRepository.update(tenantId, unitId, {
      name,
      code,
      description,
    });

    return this.unitRepository.findById(tenantId, unitId);
  }

  async listUnits(tenantId: string) {
    return this.unitRepository.list(tenantId);
  }

  async deleteUnit(tenantId: string, unitId: string) {
    const existingUnit = await this.unitRepository.findById(tenantId, unitId);
    if (!existingUnit) {
      throw new AppError('Unit not found', 404);
    }

    if (await this.unitRepository.isInUse(tenantId, unitId)) {
      throw new AppError('Unit cannot be deleted while active products or variants reference it', 409);
    }

    await this.unitRepository.softDelete(tenantId, unitId);
    return { unitId };
  }

  private normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private normalizeCode(value: string): string {
    return value.trim().toUpperCase().replace(/\s+/g, '_');
  }

  private normalizeOptionalText(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
