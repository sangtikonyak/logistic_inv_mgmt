import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../common/exceptions/app-error';
import { Queryable } from '../../../database/database.types';
import { ActivityService } from '../../activity/services/activity.service';
import { SalesRepository } from '../repositories/sales.repository';
import { Customer, CustomerListFilters, CustomerUpsertInput } from '../types/sales.types';

export class CustomerService {
  private readonly salesRepository: SalesRepository;

  constructor(
    db: Queryable,
    private readonly activityService: ActivityService
  ) {
    this.salesRepository = new SalesRepository(db);
  }

  async createCustomer(tenantId: string, actorUserId: string, input: CustomerUpsertInput) {
    const duplicate = await this.salesRepository.findCustomerByCode(tenantId, input.code);
    if (duplicate) {
      throw new AppError('Customer code already exists.', 409);
    }

    const customerId = uuidv4();
    await this.salesRepository.createCustomer({
      id: customerId,
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
      status: input.status,
      notes: input.notes ?? null,
      created_by: actorUserId,
      updated_by: actorUserId,
      deleted_by: null,
    });

    const customer = await this.mustGetCustomer(tenantId, customerId);

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'CREATE',
      module: 'SALES',
      description: `Created customer: ${customer.name} (${customer.code})`,
      metadata: { customerId, code: customer.code },
    });

    return this.toCustomerResponse(customer);
  }

  async updateCustomer(tenantId: string, actorUserId: string, customerId: string, input: Partial<CustomerUpsertInput>) {
    const existing = await this.mustGetCustomer(tenantId, customerId);
    const nextCode = input.code ?? existing.code;
    const duplicate = await this.salesRepository.findCustomerByCode(tenantId, nextCode, customerId);
    if (duplicate) {
      throw new AppError('Customer code already exists.', 409);
    }

    await this.salesRepository.updateCustomer(tenantId, customerId, {
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
      status: input.status ?? existing.status,
      notes: input.notes === undefined ? existing.notes : input.notes ?? null,
      updated_by: actorUserId,
    });

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'SALES',
      description: `Updated customer: ${existing.name}`,
      metadata: { customerId, updates: input },
    });

    return this.toCustomerResponse(await this.mustGetCustomer(tenantId, customerId));
  }

  async deleteCustomer(tenantId: string, actorUserId: string, customerId: string) {
    const existing = await this.mustGetCustomer(tenantId, customerId);
    const activeOrderCount = await this.salesRepository.countActiveOrdersForCustomer(tenantId, customerId);
    if (activeOrderCount > 0) {
      throw new AppError('Customer cannot be deleted while active sales orders exist.', 409);
    }

    await this.salesRepository.softDeleteCustomer(tenantId, customerId, actorUserId);

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'DELETE',
      module: 'SALES',
      description: `Deleted customer: ${existing.name}`,
      metadata: { customerId },
    });

    return { customerId };
  }

  async getCustomerById(tenantId: string, customerId: string) {
    return this.toCustomerResponse(await this.mustGetCustomer(tenantId, customerId));
  }

  async listCustomers(tenantId: string, filters: CustomerListFilters) {
    const [items, total] = await Promise.all([
      this.salesRepository.listCustomers(tenantId, filters),
      this.salesRepository.countCustomers(tenantId, filters),
    ]);

    return {
      items: items.map((item) => this.toCustomerResponse(item)),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
      },
    };
  }

  private async mustGetCustomer(tenantId: string, customerId: string): Promise<Customer> {
    const customer = await this.salesRepository.findCustomerById(tenantId, customerId);
    if (!customer) {
      throw new AppError('Customer not found.', 404);
    }
    return customer;
  }

  private toCustomerResponse(customer: Customer) {
    return {
      id: customer.id,
      tenantId: customer.tenant_id,
      name: customer.name,
      code: customer.code,
      email: customer.email,
      phone: customer.phone,
      contactPerson: customer.contact_person,
      taxNumber: customer.tax_number,
      addressLine1: customer.address_line_1,
      addressLine2: customer.address_line_2,
      city: customer.city,
      state: customer.state,
      postalCode: customer.postal_code,
      country: customer.country,
      status: customer.status,
      notes: customer.notes,
      createdAt: customer.created_at,
      updatedAt: customer.updated_at,
    };
  }
}
