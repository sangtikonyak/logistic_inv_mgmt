import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../common/exceptions/app-error';
import { Queryable } from '../../../database/database.types';
import { ActivityService } from '../../activity/services/activity.service';
import { PurchaseRepository } from '../repositories/purchase.repository';
import { Supplier, SupplierListFilters, SupplierUpsertInput } from '../types/purchase.types';

export class SupplierService {
  private readonly purchaseRepository: PurchaseRepository;

  constructor(
    db: Queryable,
    private readonly activityService: ActivityService
  ) {
    this.purchaseRepository = new PurchaseRepository(db);
  }

  async createSupplier(tenantId: string, actorUserId: string, input: SupplierUpsertInput) {
    const duplicate = await this.purchaseRepository.findSupplierByCode(tenantId, input.code);
    if (duplicate) {
      throw new AppError('Supplier code already exists.', 409);
    }

    const supplierId = uuidv4();
    await this.purchaseRepository.createSupplier({
      id: supplierId,
      tenant_id: tenantId,
      name: input.name,
      code: input.code,
      email: input.email ?? null,
      phone: input.phone ?? null,
      contact_person: input.contactPerson ?? null,
      tax_number: input.taxNumber ?? null,
      address_line_1: input.addressLine1 ?? null,
      address_line_2: input.addressLine2 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      postal_code: input.postalCode ?? null,
      country: input.country ?? null,
      tier: input.tier ?? 'BRONZE',
      rating: (input.rating ?? 0).toFixed(2),
      vendor_type: input.vendorType ?? 'WHOLESALER',
      status: input.status,
      notes: input.notes ?? null,
      created_by: actorUserId,
      updated_by: actorUserId,
      deleted_by: null,
    });

    const supplier = await this.mustGetSupplier(tenantId, supplierId);

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'CREATE',
      module: 'PURCHASE',
      description: `Created supplier: ${supplier.name} (${supplier.code})`,
      metadata: { supplierId, code: supplier.code },
    });

    return this.toSupplierResponse(supplier);
  }

  async updateSupplier(tenantId: string, actorUserId: string, supplierId: string, input: Partial<SupplierUpsertInput>) {
    const existing = await this.mustGetSupplier(tenantId, supplierId);
    const nextCode = input.code ?? existing.code;
    const duplicate = await this.purchaseRepository.findSupplierByCode(tenantId, nextCode, supplierId);
    if (duplicate) {
      throw new AppError('Supplier code already exists.', 409);
    }

    await this.purchaseRepository.updateSupplier(tenantId, supplierId, {
      name: input.name ?? existing.name,
      code: nextCode,
      email: input.email === undefined ? existing.email : input.email ?? null,
      phone: input.phone === undefined ? existing.phone : input.phone ?? null,
      contact_person: input.contactPerson === undefined ? existing.contact_person : input.contactPerson ?? null,
      tax_number: input.taxNumber === undefined ? existing.tax_number : input.taxNumber ?? null,
      address_line_1: input.addressLine1 === undefined ? existing.address_line_1 : input.addressLine1 ?? null,
      address_line_2: input.addressLine2 === undefined ? existing.address_line_2 : input.addressLine2 ?? null,
      city: input.city === undefined ? existing.city : input.city ?? null,
      state: input.state === undefined ? existing.state : input.state ?? null,
      postal_code: input.postalCode === undefined ? existing.postal_code : input.postalCode ?? null,
      country: input.country === undefined ? existing.country : input.country ?? null,
      tier: input.tier ?? existing.tier,
      rating: input.rating === undefined ? Number(existing.rating) : input.rating,
      vendor_type: input.vendorType ?? existing.vendor_type,
      status: input.status ?? existing.status,
      notes: input.notes === undefined ? existing.notes : input.notes ?? null,
      updated_by: actorUserId,
    });

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'PURCHASE',
      description: `Updated supplier: ${existing.name}`,
      metadata: { supplierId, updates: input },
    });

    return this.toSupplierResponse(await this.mustGetSupplier(tenantId, supplierId));
  }

  async deleteSupplier(tenantId: string, actorUserId: string, supplierId: string) {
    const existing = await this.mustGetSupplier(tenantId, supplierId);
    const activeOrderCount = await this.purchaseRepository.countActiveOrdersForSupplier(tenantId, supplierId);
    if (activeOrderCount > 0) {
      throw new AppError('Supplier cannot be deleted while active purchase orders exist.', 409);
    }

    await this.purchaseRepository.softDeleteSupplier(tenantId, supplierId, actorUserId);

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'DELETE',
      module: 'PURCHASE',
      description: `Deleted supplier: ${existing.name}`,
      metadata: { supplierId },
    });

    return { supplierId };
  }

  async getSupplierById(tenantId: string, supplierId: string) {
    return this.toSupplierResponse(await this.mustGetSupplier(tenantId, supplierId));
  }

  async listSuppliers(tenantId: string, filters: SupplierListFilters) {
    const [items, total] = await Promise.all([
      this.purchaseRepository.listSuppliers(tenantId, filters),
      this.purchaseRepository.countSuppliers(tenantId, filters),
    ]);

    return {
      items: items.map((item) => this.toSupplierResponse(item)),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
      },
    };
  }

  private async mustGetSupplier(tenantId: string, supplierId: string): Promise<Supplier> {
    const supplier = await this.purchaseRepository.findSupplierById(tenantId, supplierId);
    if (!supplier) {
      throw new AppError('Supplier not found.', 404);
    }
    return supplier;
  }

  private toSupplierResponse(supplier: Supplier) {
    return {
      id: supplier.id,
      tenantId: supplier.tenant_id,
      name: supplier.name,
      code: supplier.code,
      email: supplier.email,
      phone: supplier.phone,
      contactPerson: supplier.contact_person,
      taxNumber: supplier.tax_number,
      addressLine1: supplier.address_line_1,
      addressLine2: supplier.address_line_2,
      city: supplier.city,
      state: supplier.state,
      postalCode: supplier.postal_code,
      country: supplier.country,
      tier: supplier.tier,
      rating: Number(supplier.rating),
      vendorType: supplier.vendor_type,
      status: supplier.status,
      notes: supplier.notes,
      createdAt: supplier.created_at,
      updatedAt: supplier.updated_at,
    };
  }
}
